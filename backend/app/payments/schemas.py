import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    invoice_id: uuid.UUID
    amount: Decimal = Field(gt=0)
    payment_method: str
    reference: str | None = None
    notes: str | None = None


class PaymentReverse(BaseModel):
    reason: str = Field(min_length=1)


class PaymentResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    amount: Decimal
    payment_method: str
    reference: str | None
    notes: str | None
    received_by: uuid.UUID
    status: str
    reversed_at: datetime | None
    reversed_by: uuid.UUID | None
    reversal_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentSummary(BaseModel):
    invoice_id: uuid.UUID
    invoice_total: Decimal
    paid_amount: Decimal
    balance: Decimal
    payments: list[PaymentResponse]
