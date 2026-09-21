import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.db import get_db
from app.job_cards import schemas, service

owners_router = APIRouter(prefix="/owners", tags=["owners"])
vehicles_router = APIRouter(prefix="/vehicles", tags=["vehicles"])
job_cards_router = APIRouter(prefix="/job-cards", tags=["job-cards"])


# --- Owners ---

@owners_router.post("/", response_model=schemas.OwnerResponse, status_code=201)
async def create_owner(
    body: schemas.OwnerCreate,
    _user=Depends(RequirePermission("job_cards", "create")),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_owner(db, body.name, body.phone)


@owners_router.get("/", response_model=PaginatedResponse[schemas.OwnerResponse])
async def list_owners(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_owners(db, page, page_size, search)


@owners_router.get("/{owner_id}", response_model=schemas.OwnerResponse)
async def get_owner(
    owner_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    owner = await service.get_owner(db, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner


@owners_router.delete("/{owner_id}", status_code=204)
async def delete_owner(
    owner_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("job_cards", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_owner(db, owner_id)
    await create_audit_log(db, current_user.id, "owner.delete", "owner", owner_id)
    await db.commit()


@owners_router.patch("/{owner_id}", response_model=schemas.OwnerResponse)
async def update_owner(
    owner_id: uuid.UUID,
    body: schemas.OwnerUpdate,
    _user=Depends(RequirePermission("job_cards", "update")),
    db: AsyncSession = Depends(get_db),
):
    owner = await service.get_owner(db, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return await service.update_owner(db, owner, **body.model_dump(exclude_unset=True))


# --- Vehicles ---

@vehicles_router.post("/", response_model=schemas.VehicleResponse, status_code=201)
async def create_vehicle(
    body: schemas.VehicleCreate,
    _user=Depends(RequirePermission("job_cards", "create")),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_vehicle(db, **body.model_dump())


@vehicles_router.get("/", response_model=PaginatedResponse[schemas.VehicleResponse])
async def list_vehicles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    owner_id: uuid.UUID | None = Query(default=None),
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_vehicles(db, page, page_size, search, owner_id)


@vehicles_router.get("/{vehicle_id}", response_model=schemas.VehicleResponse)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    vehicle = await service.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@vehicles_router.get("/{vehicle_id}/history")
async def get_vehicle_history(
    vehicle_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    vehicle = await service.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    owner = await service.get_owner(db, vehicle.owner_id)
    jobs = await service.list_job_cards(db, page=1, page_size=100, vehicle_id=vehicle_id)
    from app.performa.models import Performa
    from sqlalchemy.orm import selectinload
    performa_result = await db.execute(
        select(Performa).options(selectinload(Performa.line_items))
        .where(Performa.vehicle_id == vehicle_id).order_by(Performa.created_at.desc())
    )
    performas = list(performa_result.scalars().all())
    return {
        "vehicle": schemas.VehicleResponse.model_validate(vehicle),
        "owner": schemas.OwnerResponse.model_validate(owner),
        "job_cards": [schemas.JobCardResponse.model_validate(job) for job in jobs["items"]],
        "performas": [
            {
                "id": item.id, "job_card_id": item.job_card_id, "version": item.version,
                "status": item.status, "grand_total": item.grand_total, "created_at": item.created_at,
            }
            for item in performas
        ],
    }


@vehicles_router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("job_cards", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_vehicle(db, vehicle_id)
    await create_audit_log(db, current_user.id, "vehicle.delete", "vehicle", vehicle_id)
    await db.commit()


# --- Job Cards ---

@job_cards_router.post("/", response_model=schemas.JobCardResponse, status_code=201)
async def create_job_card(
    body: schemas.JobCardCreate,
    current_user: User = Depends(RequirePermission("job_cards", "create")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.create_job_card(
        db,
        created_by=current_user.id,
        conditions=[c.model_dump() for c in body.conditions],
        staff_assignments=[assignment.model_dump() for assignment in body.staff_assignments] + [
            {"employee_id": employee_id, "work_category": "mechanic"}
            for employee_id in body.mechanic_ids
            if employee_id not in {assignment.employee_id for assignment in body.staff_assignments}
        ],
        vehicle_id=body.vehicle_id,
        owner_id=body.owner_id,
        mileage_km=body.mileage_km,
        private_paint=body.private_paint,
        private_mechanic=body.private_mechanic,
        insurance_provider=body.insurance_provider,
        description=body.description,
        remarks=body.remarks,
        requested_materials=body.requested_materials,
    )
    await create_audit_log(db, current_user.id, "job_card.create", "job_card", jc.id)
    await db.commit()
    return jc


@job_cards_router.get("/", response_model=PaginatedResponse[schemas.JobCardResponse])
async def list_job_cards(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    owner_id: uuid.UUID | None = Query(default=None),
    vehicle_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_job_cards(db, page, page_size, search, status, owner_id, vehicle_id, date_from, date_to)


@job_cards_router.get("/{job_card_id}", response_model=schemas.JobCardResponse)
async def get_job_card(
    job_card_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    return jc


@job_cards_router.get("/{job_card_id}/history")
async def get_job_card_history(
    job_card_id: uuid.UUID,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    from app.audit.models import AuditLog
    from app.inventory.models import InventoryMovement
    audit_result = await db.execute(
        select(AuditLog).where(AuditLog.entity_type == "job_card", AuditLog.entity_id == job_card_id)
        .order_by(AuditLog.created_at.desc())
    )
    movement_result = await db.execute(
        select(InventoryMovement).where(InventoryMovement.job_card_id == job_card_id)
        .order_by(InventoryMovement.created_at.desc())
    )
    return {
        "events": [
            {"id": event.id, "action": event.action, "details": event.details,
             "user_id": event.user_id, "created_at": event.created_at}
            for event in audit_result.scalars().all()
        ],
        "inventory_movements": [
            {"id": movement.id, "item_id": movement.item_id, "store_location_id": movement.store_location_id,
             "quantity_change": movement.quantity_change, "quantity_before": movement.quantity_before,
             "quantity_after": movement.quantity_after, "created_at": movement.created_at}
            for movement in movement_result.scalars().all()
        ],
    }


@job_cards_router.delete("/{job_card_id}", status_code=204)
async def delete_job_card(
    job_card_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("job_cards", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_job_card(db, job_card_id)
    await create_audit_log(db, current_user.id, "job_card.delete", "job_card", job_card_id)
    await db.commit()


@job_cards_router.patch("/{job_card_id}", response_model=schemas.JobCardResponse)
async def update_job_card(
    job_card_id: uuid.UUID,
    body: schemas.JobCardUpdate,
    current_user: User = Depends(RequirePermission("job_cards", "update")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    updated = await service.update_job_card(db, jc, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "job_card.update", "job_card", jc.id)
    await db.commit()
    return updated


@job_cards_router.post("/{job_card_id}/inventory-usage", response_model=schemas.InventoryUsageResponse, status_code=201)
async def use_inventory(
    job_card_id: uuid.UUID,
    body: schemas.InventoryUsageCreate,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    usage = await service.use_inventory(db, job_card_id, body.item_id, body.store_location_id, body.quantity, current_user.id)
    await create_audit_log(db, current_user.id, "inventory.consume", "job_card", job_card_id,
                           details={"item_id": str(body.item_id), "quantity": body.quantity})
    await db.commit()
    return usage


@job_cards_router.patch("/{job_card_id}/status", response_model=schemas.JobCardResponse)
async def update_status(
    job_card_id: uuid.UUID,
    body: schemas.StatusUpdate,
    current_user: User = Depends(RequirePermission("job_cards", "update")),
    db: AsyncSession = Depends(get_db),
):
    jc = await service.get_job_card(db, job_card_id)
    if not jc:
        raise HTTPException(status_code=404, detail="Job card not found")
    updated = await service.update_status(db, jc, body.status.value)
    await create_audit_log(
        db, current_user.id, "job_card.status_change", "job_card", jc.id,
        details={"from": jc.status, "to": body.status.value},
    )
    await db.commit()
    return updated
