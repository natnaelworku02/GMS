import uuid
from datetime import datetime

from pydantic import BaseModel


class ToolCreate(BaseModel):
    name: str
    specifications: str | None = None
    total_quantity: int


class ToolUpdate(BaseModel):
    name: str | None = None
    specifications: str | None = None
    total_quantity: int | None = None


class ToolResponse(BaseModel):
    id: uuid.UUID
    name: str
    specifications: str | None
    total_quantity: int
    available_quantity: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class CheckoutCreate(BaseModel):
    tool_id: uuid.UUID
    employee_id: uuid.UUID
    job_card_id: uuid.UUID
    quantity: int


class CheckoutResponse(BaseModel):
    id: uuid.UUID
    tool_id: uuid.UUID
    employee_id: uuid.UUID
    job_card_id: uuid.UUID
    quantity: int
    checked_out_at: datetime
    checked_in_at: datetime | None
    issued_by: uuid.UUID

    model_config = {"from_attributes": True}
