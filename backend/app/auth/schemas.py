import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# --- Auth ---
class LoginRequest(BaseModel):
    phone: str
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# --- User ---
class UserCreate(BaseModel):
    phone: str
    password: str = Field(min_length=8)
    full_name: str
    role_id: uuid.UUID


class UserUpdate(BaseModel):
    full_name: str | None = None
    role_id: uuid.UUID | None = None
    is_active: bool | None = None


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: uuid.UUID
    phone: str
    full_name: str
    role_id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Role ---
class RoleCreate(BaseModel):
    name: str
    is_superadmin: bool = False


class RoleUpdate(BaseModel):
    name: str | None = None


class PermissionSet(BaseModel):
    module: str
    can_create: bool = False
    can_read: bool = False
    can_update: bool = False
    can_delete: bool = False


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    is_superadmin: bool
    created_at: datetime
    permissions: list[PermissionSet] = []

    model_config = {"from_attributes": True}


# --- System Settings ---
class SettingUpdate(BaseModel):
    value: str


class SettingResponse(BaseModel):
    id: uuid.UUID
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}
