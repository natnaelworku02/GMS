import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class InvoiceLineItemResponse(BaseModel):
    id: uuid.UUID
    type: str
    description: str
    inventory_item_id: uuid.UUID | None
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    performa_id: uuid.UUID
    job_card_id: uuid.UUID
    invoice_number: str
    subtotal: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    grand_total: Decimal
    client_email: str | None
    created_at: datetime
    line_items: list[InvoiceLineItemResponse] = []

    model_config = {"from_attributes": True}


class InvoiceCreateFromPerforma(BaseModel):
    performa_id: uuid.UUID
