import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class StoreLocationCreate(BaseModel):
    name: str


class StoreLocationResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryItemCreate(BaseModel):
    part_name: str
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal
    supplier_info: str | None = None
    min_stock_threshold: int = 0


class InventoryItemUpdate(BaseModel):
    part_name: str | None = None
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal | None = None
    supplier_info: str | None = None
    min_stock_threshold: int | None = None


class StockEntryResponse(BaseModel):
    id: uuid.UUID
    store_location_id: uuid.UUID
    quantity: int

    model_config = {"from_attributes": True}


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    part_name: str
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal
    supplier_info: str | None
    min_stock_threshold: int
    created_at: datetime
    stock_entries: list[StockEntryResponse] = []

    model_config = {"from_attributes": True}


class StockUpdate(BaseModel):
    item_id: uuid.UUID
    store_location_id: uuid.UUID
    quantity: int
