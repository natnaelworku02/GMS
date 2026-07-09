import uuid
from datetime import date

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.job_cards.models import JobCard, JobStatus, Owner, Vehicle, VehicleCondition, job_card_mechanics


VALID_TRANSITIONS: dict[str, list[str]] = {
    JobStatus.PENDING_INSPECTION.value: [JobStatus.WAITING_FOR_APPROVAL.value],
    JobStatus.WAITING_FOR_APPROVAL.value: [JobStatus.IN_REPAIR.value],
    JobStatus.IN_REPAIR.value: [JobStatus.WAITING_FOR_PARTS.value, JobStatus.READY_FOR_TESTING.value],
    JobStatus.WAITING_FOR_PARTS.value: [JobStatus.IN_REPAIR.value],
    JobStatus.READY_FOR_TESTING.value: [JobStatus.COMPLETED.value],
}


# --- Owner ---
async def create_owner(db: AsyncSession, name: str, phone: str) -> Owner:
    owner = Owner(name=name, phone=phone)
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner


async def get_owner(db: AsyncSession, owner_id: uuid.UUID) -> Owner | None:
    result = await db.execute(select(Owner).where(Owner.id == owner_id))
    return result.scalar_one_or_none()


async def list_owners(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None):
    query = select(Owner).order_by(Owner.name)
    if search:
        query = query.where(or_(Owner.name.ilike(f"%{search}%"), Owner.phone.ilike(f"%{search}%")))
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def update_owner(db: AsyncSession, owner: Owner, **kwargs) -> Owner:
    for key, value in kwargs.items():
        if value is not None:
            setattr(owner, key, value)
    await db.commit()
    await db.refresh(owner)
    return owner


# --- Vehicle ---
async def create_vehicle(db: AsyncSession, **kwargs) -> Vehicle:
    vehicle = Vehicle(**kwargs)
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_vehicle(db: AsyncSession, vehicle_id: uuid.UUID) -> Vehicle | None:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    return result.scalar_one_or_none()


async def list_vehicles(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None, owner_id: uuid.UUID | None = None):
    query = select(Vehicle).order_by(Vehicle.created_at.desc())
    if search:
        query = query.where(
            or_(
                Vehicle.model.ilike(f"%{search}%"),
                Vehicle.plate_number.ilike(f"%{search}%"),
                Vehicle.chassis_number.ilike(f"%{search}%"),
                Vehicle.engine_number.ilike(f"%{search}%"),
            )
        )
    if owner_id:
        query = query.where(Vehicle.owner_id == owner_id)
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def update_vehicle(db: AsyncSession, vehicle: Vehicle, **kwargs) -> Vehicle:
    for key, value in kwargs.items():
        if value is not None:
            setattr(vehicle, key, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


# --- Job Card ---
async def create_job_card(
    db: AsyncSession,
    created_by: uuid.UUID,
    conditions: list[dict],
    mechanic_ids: list[uuid.UUID],
    **kwargs,
) -> JobCard:
    job_card = JobCard(created_by=created_by, **kwargs)
    db.add(job_card)
    await db.flush()

    for cond in conditions:
        vc = VehicleCondition(job_card_id=job_card.id, **cond)
        db.add(vc)

    if mechanic_ids:
        for mech_id in mechanic_ids:
            await db.execute(job_card_mechanics.insert().values(
                job_card_id=job_card.id, employee_id=mech_id
            ))

    await db.commit()
    return await get_job_card(db, job_card.id)


async def get_job_card(db: AsyncSession, job_card_id: uuid.UUID) -> JobCard | None:
    result = await db.execute(
        select(JobCard)
        .options(selectinload(JobCard.conditions), selectinload(JobCard.mechanics))
        .where(JobCard.id == job_card_id)
    )
    return result.scalar_one_or_none()


async def list_job_cards(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status: str | None = None,
    owner_id: uuid.UUID | None = None,
    vehicle_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    query = select(JobCard).options(selectinload(JobCard.conditions), selectinload(JobCard.mechanics)).order_by(JobCard.created_at.desc())
    if search:
        query = query.where(or_(JobCard.description.ilike(f"%{search}%"), JobCard.remarks.ilike(f"%{search}%")))
    if status:
        query = query.where(JobCard.status == status)
    if owner_id:
        query = query.where(JobCard.owner_id == owner_id)
    if vehicle_id:
        query = query.where(JobCard.vehicle_id == vehicle_id)
    if date_from:
        query = query.where(JobCard.created_at >= date_from)
    if date_to:
        query = query.where(JobCard.created_at <= date_to)
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def update_job_card(db: AsyncSession, job_card: JobCard, **kwargs) -> JobCard:
    for key, value in kwargs.items():
        if value is not None:
            setattr(job_card, key, value)
    await db.commit()
    return await get_job_card(db, job_card.id)


async def update_status(db: AsyncSession, job_card: JobCard, new_status: str) -> JobCard:
    current = job_card.status
    valid_next = VALID_TRANSITIONS.get(current, [])

    if new_status not in valid_next:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid transition from '{current}' to '{new_status}'. Valid: {valid_next}",
        )

    # Guard: completion requires all tools returned
    if new_status == JobStatus.COMPLETED.value:
        from app.tools.models import ToolCheckout
        result = await db.execute(
            select(ToolCheckout).where(
                ToolCheckout.job_card_id == job_card.id,
                ToolCheckout.checked_in_at.is_(None),
            )
        )
        unreturned = list(result.scalars().all())
        if unreturned:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot complete: {len(unreturned)} unreturned tool checkout(s)",
            )

    job_card.status = new_status
    await db.commit()
    return await get_job_card(db, job_card.id)
