import uuid
from datetime import datetime

from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    name: str
    job_title: str
    phone: str


class EmployeeUpdate(BaseModel):
    name: str | None = None
    job_title: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    name: str
    job_title: str
    phone: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
