import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.db import get_db
from app.inventory import schemas, service
from app.inventory.models import StoreLocation

locations_router = APIRouter(prefix="/inventory/locations", tags=["inventory"])
items_router = APIRouter(prefix="/inventory/items", tags=["inventory"])
stock_router = APIRouter(prefix="/inventory/stock", tags=["inventory"])


@locations_router.post("/", response_model=schemas.StoreLocationResponse, status_code=201)
async def create_location(
    body: schemas.StoreLocationCreate,
    _user=Depends(RequirePermission("inventory", "create")),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_location(db, body.name)


@locations_router.delete("/{location_id}", status_code=204)
async def delete_location(
    location_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("inventory", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_location(db, location_id)
    await create_audit_log(db, current_user.id, "location.delete", "store_location", location_id)
    await db.commit()


@locations_router.patch("/{location_id}", response_model=schemas.StoreLocationResponse)
async def update_location(
    location_id: uuid.UUID,
    body: schemas.StoreLocationUpdate,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StoreLocation).where(StoreLocation.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    updated = await service.update_location(db, location, body.name)
    await create_audit_log(db, current_user.id, "location.update", "store_location", location_id,
                           details={"new_name": body.name})
    await db.commit()
    return updated


@locations_router.get("/", response_model=PaginatedResponse[schemas.StoreLocationResponse])
async def list_locations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_locations(db, page, page_size, search)


@items_router.post("/", response_model=schemas.InventoryItemResponse, status_code=201)
async def create_item(
    body: schemas.InventoryItemCreate,
    current_user: User = Depends(RequirePermission("inventory", "create")),
    db: AsyncSession = Depends(get_db),
):
    item = await service.create_item(db, **body.model_dump())
    await create_audit_log(db, current_user.id, "inventory.create", "inventory_item", item.id)
    await db.commit()
    return item


@items_router.get("/", response_model=PaginatedResponse[schemas.InventoryItemResponse])
async def list_items(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_items(db, page, page_size, search, vehicle_type)


@items_router.get("/{item_id}", response_model=schemas.InventoryItemResponse)
async def get_item(
    item_id: uuid.UUID,
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    item = await service.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@items_router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("inventory", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_item(db, item_id)
    await create_audit_log(db, current_user.id, "inventory.delete", "inventory_item", item_id)
    await db.commit()


@items_router.patch("/{item_id}", response_model=schemas.InventoryItemResponse)
async def update_item(
    item_id: uuid.UUID,
    body: schemas.InventoryItemUpdate,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    item = await service.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    updated = await service.update_item(db, item, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "inventory.update", "inventory_item", item.id)
    await db.commit()
    return updated


@stock_router.put("/", response_model=schemas.StockEntryResponse)
async def set_stock(
    body: schemas.StockUpdate,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    entry = await service.set_stock(db, body.item_id, body.store_location_id, body.quantity)
    await create_audit_log(db, current_user.id, "stock.set", "inventory_item", body.item_id,
                           details={"store": str(body.store_location_id), "quantity": body.quantity})
    await db.commit()
    return entry


@stock_router.post("/adjust", response_model=schemas.StockEntryResponse)
async def adjust_stock(
    body: schemas.StockAdjust,
    current_user: User = Depends(RequirePermission("inventory", "update")),
    db: AsyncSession = Depends(get_db),
):
    try:
        entry = await service.adjust_stock(db, body.item_id, body.store_location_id, body.delta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await create_audit_log(db, current_user.id, "stock.adjust", "inventory_item", body.item_id,
                           details={"store": str(body.store_location_id), "delta": body.delta})
    await db.commit()
    return entry
