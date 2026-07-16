import uuid

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.inventory.models import InventoryItem, StockEntry, StoreLocation


async def create_location(db: AsyncSession, name: str) -> StoreLocation:
    loc = StoreLocation(name=name)
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc


async def list_locations(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None):
    query = select(StoreLocation).order_by(StoreLocation.name)
    if search:
        query = query.where(StoreLocation.name.ilike(f"%{search}%"))
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def create_item(db: AsyncSession, **kwargs) -> InventoryItem:
    item = InventoryItem(**kwargs)
    db.add(item)
    await db.commit()
    return await get_item(db, item.id)


async def get_item(db: AsyncSession, item_id: uuid.UUID) -> InventoryItem | None:
    result = await db.execute(
        select(InventoryItem).options(selectinload(InventoryItem.stock_entries)).where(InventoryItem.id == item_id)
    )
    return result.scalar_one_or_none()


async def list_items(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None, vehicle_type: str | None = None):
    query = select(InventoryItem).options(selectinload(InventoryItem.stock_entries)).order_by(InventoryItem.part_name)
    if search:
        query = query.where(
            or_(InventoryItem.part_name.ilike(f"%{search}%"), InventoryItem.supplier_info.ilike(f"%{search}%"))
        )
    if vehicle_type:
        query = query.where(InventoryItem.applicable_vehicle_types.any(vehicle_type))
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def update_item(db: AsyncSession, item: InventoryItem, **kwargs) -> InventoryItem:
    for key, value in kwargs.items():
        if value is not None:
            setattr(item, key, value)
    await db.commit()
    return await get_item(db, item.id)


async def delete_location(db: AsyncSession, location_id: uuid.UUID):
    result = await db.execute(select(StockEntry).where(StockEntry.store_location_id == location_id).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete location: stock entries reference it")
    loc = await db.execute(select(StoreLocation).where(StoreLocation.id == location_id))
    loc = loc.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    await db.delete(loc)
    await db.commit()


async def delete_item(db: AsyncSession, item_id: uuid.UUID):
    from app.job_cards.models import JobCardInventoryUsage
    result = await db.execute(select(JobCardInventoryUsage).where(JobCardInventoryUsage.item_id == item_id).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete item: referenced in job card inventory usage")
    item = await get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()


async def update_location(db: AsyncSession, location: StoreLocation, name: str) -> StoreLocation:
    location.name = name
    await db.commit()
    await db.refresh(location)
    return location


async def adjust_stock(db: AsyncSession, item_id: uuid.UUID, store_location_id: uuid.UUID, delta: int) -> StockEntry:
    result = await db.execute(
        select(StockEntry).where(
            StockEntry.item_id == item_id,
            StockEntry.store_location_id == store_location_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        new_qty = entry.quantity + delta
        if new_qty < 0:
            raise ValueError("Insufficient stock")
        entry.quantity = new_qty
    else:
        if delta < 0:
            raise ValueError("Insufficient stock")
        entry = StockEntry(item_id=item_id, store_location_id=store_location_id, quantity=delta)
        db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def set_stock(db: AsyncSession, item_id: uuid.UUID, store_location_id: uuid.UUID, quantity: int) -> StockEntry:
    result = await db.execute(
        select(StockEntry).where(
            StockEntry.item_id == item_id,
            StockEntry.store_location_id == store_location_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.quantity = quantity
    else:
        entry = StockEntry(item_id=item_id, store_location_id=store_location_id, quantity=quantity)
        db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def deduct_stock(db: AsyncSession, item_id: uuid.UUID, store_location_id: uuid.UUID, quantity: int) -> StockEntry | None:
    result = await db.execute(
        select(StockEntry).where(
            StockEntry.item_id == item_id,
            StockEntry.store_location_id == store_location_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry or entry.quantity < quantity:
        return None
    entry.quantity -= quantity
    await db.flush()
    return entry


async def get_aggregate_stock(db: AsyncSession, item_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(StockEntry.quantity), 0)).where(StockEntry.item_id == item_id)
    )
    return result.scalar()


async def check_low_stock(db: AsyncSession, item_id: uuid.UUID) -> bool:
    item = await get_item(db, item_id)
    if not item or item.min_stock_threshold == 0:
        return False
    total = await get_aggregate_stock(db, item_id)
    return total < item.min_stock_threshold
