import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class LineItemCreate(BaseModel):
    type: str
    description: str
    inventory_item_id: uuid.UUID | None = None
    quantity: int = 1
    unit_price: Decimal


class LineItemResponse(BaseModel):
    id: uuid.UUID
    type: str
    description: str
    inventory_item_id: uuid.UUID | None
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}


class PerformaCreate(BaseModel):
    job_card_id: uuid.UUID
    client_email: str | None = None
    line_items: list[LineItemCreate]


class PerformaResponse(BaseModel):
    id: uuid.UUID
    job_card_id: uuid.UUID
    version: int
    subtotal: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    grand_total: Decimal
    status: str
    client_email: str | None
    sent_at: datetime | None
    created_at: datetime
    line_items: list[LineItemResponse] = []

    model_config = {"from_attributes": True}


class PerformaStatusUpdate(BaseModel):
    status: str


class PerformaRevise(BaseModel):
    line_items: list[LineItemCreate]


class PerformaSendRequest(BaseModel):
    client_email: str
