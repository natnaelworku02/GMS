import uuid
from datetime import datetime

from pydantic import BaseModel

from app.hr.schemas import EmployeeResponse
from app.job_cards.models import ConditionState, JobStatus, PartName


# --- Owner ---
class OwnerCreate(BaseModel):
    name: str
    phone: str


class OwnerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


class OwnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Vehicle ---
class VehicleCreate(BaseModel):
    owner_id: uuid.UUID
    model: str
    type: str
    engine_number: str
    chassis_number: str
    plate_number: str


class VehicleUpdate(BaseModel):
    model: str | None = None
    type: str | None = None
    engine_number: str | None = None
    chassis_number: str | None = None
    plate_number: str | None = None


class VehicleResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    model: str
    type: str
    engine_number: str
    chassis_number: str
    plate_number: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Vehicle Condition ---
class VehicleConditionInput(BaseModel):
    part_name: PartName
    condition_state: ConditionState


class VehicleConditionResponse(BaseModel):
    id: uuid.UUID
    part_name: str
    condition_state: str

    model_config = {"from_attributes": True}


# --- Job Card ---
class JobCardCreate(BaseModel):
    vehicle_id: uuid.UUID
    owner_id: uuid.UUID
    mileage_km: int
    private_paint: bool = False
    private_mechanic: bool = False
    insurance_provider: str | None = None
    description: str
    remarks: str | None = None
    requested_materials: str | None = None
    conditions: list[VehicleConditionInput] = []
    mechanic_ids: list[uuid.UUID] = []


class JobCardUpdate(BaseModel):
    mileage_km: int | None = None
    private_paint: bool | None = None
    private_mechanic: bool | None = None
    insurance_provider: str | None = None
    description: str | None = None
    remarks: str | None = None
    requested_materials: str | None = None


class StatusUpdate(BaseModel):
    status: JobStatus


class JobCardResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    owner_id: uuid.UUID
    status: str
    mileage_km: int
    private_paint: bool
    private_mechanic: bool
    insurance_provider: str | None
    description: str
    remarks: str | None
    requested_materials: str | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    conditions: list[VehicleConditionResponse] = []
    mechanics: list[EmployeeResponse] = []

    model_config = {"from_attributes": True}
