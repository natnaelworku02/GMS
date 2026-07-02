import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.inventory import schemas, service

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


@locations_router.get("/", response_model=list[schemas.StoreLocationResponse])
async def list_locations(
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_locations(db)


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


@items_router.get("/", response_model=list[schemas.InventoryItemResponse])
async def list_items(
    _user=Depends(RequirePermission("inventory", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_items(db)


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
