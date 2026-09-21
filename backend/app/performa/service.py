import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.service import get_setting
from app.core.pagination import paginate_query
from app.performa.models import Performa, PerformaLineItem
from app.job_cards.models import JobCard, Vehicle

async def create_performa(
    db: AsyncSession,
    vehicle_id: uuid.UUID | None,
    job_card_id: uuid.UUID | None,
    client_email: str | None,
    line_items: list[dict],
    series_id: uuid.UUID | None = None,
) -> Performa:
    vat_setting = await get_setting(db, "vat_rate")
    vat_rate = Decimal(vat_setting.value) if vat_setting else Decimal("15.0")

    if job_card_id:
        job_result = await db.execute(select(JobCard).where(JobCard.id == job_card_id))
        job_card = job_result.scalar_one_or_none()
        if not job_card:
            raise ValueError("Job card not found")
        if vehicle_id and vehicle_id != job_card.vehicle_id:
            raise ValueError("Vehicle does not match the selected job card")
        vehicle_id = job_card.vehicle_id
    if not vehicle_id:
        raise ValueError("A vehicle or job card is required")
    vehicle_result = await db.execute(select(Vehicle.id).where(Vehicle.id == vehicle_id))
    if not vehicle_result.scalar_one_or_none():
        raise ValueError("Vehicle not found")

    series_id = series_id or uuid.uuid4()
    result = await db.execute(
        select(Performa).where(Performa.series_id == series_id).order_by(Performa.version.desc()).limit(1)
    )
    latest = result.scalar_one_or_none()
    version = latest.version + 1 if latest else 1

    performa = Performa(
        vehicle_id=vehicle_id,
        job_card_id=job_card_id,
        series_id=series_id,
        version=version,
        client_email=client_email,
        vat_rate=vat_rate,
    )
    db.add(performa)
    await db.flush()

    subtotal = Decimal("0")
    for item_data in line_items:
        total_price = Decimal(str(item_data["unit_price"])) * item_data["quantity"]
        line_item = PerformaLineItem(
            performa_id=performa.id,
            type=item_data["type"],
            description=item_data["description"],
            inventory_item_id=item_data.get("inventory_item_id"),
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=total_price,
        )
        db.add(line_item)
        subtotal += total_price

    vat_amount = subtotal * vat_rate / Decimal("100")
    performa.subtotal = subtotal
    performa.vat_amount = vat_amount
    performa.grand_total = subtotal + vat_amount

    await db.commit()
    return await get_performa(db, performa.id)


async def get_performa(db: AsyncSession, performa_id: uuid.UUID) -> Performa | None:
    result = await db.execute(
        select(Performa).options(selectinload(Performa.line_items)).where(Performa.id == performa_id)
    )
    return result.scalar_one_or_none()


async def list_performas(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None, job_card_id: uuid.UUID | None = None, status: str | None = None):
    query = select(Performa).options(selectinload(Performa.line_items)).order_by(Performa.created_at.desc())
    if search:
        query = query.where(Performa.client_email.ilike(f"%{search}%"))
    if job_card_id:
        query = query.where(Performa.job_card_id == job_card_id)
    if status:
        query = query.where(Performa.status == status)
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def update_status(db: AsyncSession, performa: Performa, status: str) -> Performa:
    performa.status = status
    await db.commit()
    return await get_performa(db, performa.id)


async def revise_performa(db: AsyncSession, performa_id: uuid.UUID, line_items: list[dict]) -> Performa | None:
    original = await get_performa(db, performa_id)
    if not original:
        return None
    return await create_performa(
        db, original.vehicle_id, original.job_card_id, original.client_email, line_items, original.series_id
    )


async def link_job_card(db: AsyncSession, performa: Performa, job_card_id: uuid.UUID) -> Performa:
    result = await db.execute(select(JobCard).where(JobCard.id == job_card_id))
    job_card = result.scalar_one_or_none()
    if not job_card:
        raise ValueError("Job card not found")
    if job_card.vehicle_id != performa.vehicle_id:
        raise ValueError("Job card vehicle does not match proforma vehicle")
    performa.job_card_id = job_card_id
    await db.commit()
    return await get_performa(db, performa.id)
