import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
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


@owners_router.get("/", response_model=list[schemas.OwnerResponse])
async def list_owners(
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_owners(db)


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


@vehicles_router.get("/", response_model=list[schemas.VehicleResponse])
async def list_vehicles(
    owner_id: uuid.UUID | None = None,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_vehicles(db, owner_id)


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
        mechanic_ids=body.mechanic_ids,
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


@job_cards_router.get("/", response_model=list[schemas.JobCardResponse])
async def list_job_cards(
    status: str | None = None,
    _user=Depends(RequirePermission("job_cards", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_job_cards(db, status)


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
