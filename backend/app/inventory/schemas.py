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
    condition: str = "new"
    origin: str = "original"
    applicable_vehicle_types: list[str] | None = None
    unit_price: Decimal
    supplier_info: str | None = None
    min_stock_threshold: int = 0


class InventoryItemUpdate(BaseModel):
    part_name: str | None = None
    condition: str | None = None
    origin: str | None = None
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
    condition: str
    origin: str
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


class StockAdjust(BaseModel):
    item_id: uuid.UUID
    store_location_id: uuid.UUID
    delta: int


class StoreLocationUpdate(BaseModel):
    name: str


class InventoryMovementResponse(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    store_location_id: uuid.UUID
    job_card_id: uuid.UUID | None
    user_id: uuid.UUID
    movement_type: str
    quantity_change: int
    quantity_before: int
    quantity_after: int
    created_at: datetime

    model_config = {"from_attributes": True}
