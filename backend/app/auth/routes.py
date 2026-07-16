import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import schemas, service
from app.auth.models import SystemSetting, User
from app.core.audit import create_audit_log
from app.core.deps import get_current_user
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.core.security import decode_token
from app.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])


# --- Auth ---

@router.post("/login", response_model=schemas.TokenResponse)
async def login(body: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await service.authenticate_user(db, body.phone, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return service.create_tokens(user)


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh(body: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await service.get_user(db, uuid.UUID(payload["user_id"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return service.create_tokens(user)


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Users ---

@router.post("/users", response_model=schemas.UserResponse, status_code=201)
async def create_user(
    body: schemas.UserCreate,
    current_user: User = Depends(RequirePermission("users", "create")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.create_user(db, body.phone, body.password, body.full_name, body.role_id)
    await create_audit_log(db, current_user.id, "user.create", "user", user.id)
    await db.commit()
    return user


@router.get("/users", response_model=PaginatedResponse[schemas.UserResponse])
async def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_users(db, page, page_size, search, is_active)


@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user(
    user_id: uuid.UUID,
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: schemas.UserUpdate,
    current_user: User = Depends(RequirePermission("users", "update")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated = await service.update_user(db, user, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "user.update", "user", user.id)
    await db.commit()
    return updated


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("users", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_user(db, user_id)
    await create_audit_log(db, current_user.id, "user.delete", "user", user_id)
    await db.commit()


@router.patch("/users/{user_id}/password")
async def reset_password(
    user_id: uuid.UUID,
    body: schemas.PasswordReset,
    current_user: User = Depends(RequirePermission("users", "update")),
    db: AsyncSession = Depends(get_db),
):
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await service.reset_password(db, user, body.new_password)
    await create_audit_log(db, current_user.id, "user.password_reset", "user", user.id)
    await db.commit()
    return {"detail": "Password reset successfully"}


# --- Roles ---

@roles_router.post("/", response_model=schemas.RoleResponse, status_code=201)
async def create_role(
    body: schemas.RoleCreate,
    current_user: User = Depends(RequirePermission("users", "create")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.create_role(db, body.name, body.is_superadmin)
    await create_audit_log(db, current_user.id, "role.create", "role", role.id)
    await db.commit()
    return role


@roles_router.get("/", response_model=PaginatedResponse[schemas.RoleResponse])
async def list_roles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_roles(db, page, page_size, search)


@roles_router.get("/{role_id}", response_model=schemas.RoleResponse)
async def get_role(
    role_id: uuid.UUID,
    _user=Depends(RequirePermission("users", "read")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@roles_router.delete("/{role_id}", status_code=204)
async def delete_role(
    role_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("users", "delete")),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_role(db, role_id)
    await create_audit_log(db, current_user.id, "role.delete", "role", role_id)
    await db.commit()


@roles_router.put("/{role_id}/permissions", response_model=schemas.RoleResponse)
async def set_permissions(
    role_id: uuid.UUID,
    body: list[schemas.PermissionSet],
    current_user: User = Depends(RequirePermission("users", "update")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.set_role_permissions(db, role_id, [p.model_dump() for p in body])
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await create_audit_log(db, current_user.id, "role.permissions_update", "role", role_id)
    await db.commit()
    return role


# --- System Settings ---

@settings_router.get("/", response_model=list[schemas.SettingResponse])
async def list_settings(
    _user=Depends(RequirePermission("settings", "read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting))
    return list(result.scalars().all())


@settings_router.put("/{key}", response_model=schemas.SettingResponse)
async def update_setting(
    key: str,
    body: schemas.SettingUpdate,
    current_user: User = Depends(RequirePermission("settings", "update")),
    db: AsyncSession = Depends(get_db),
):
    setting = await service.upsert_setting(db, key, body.value)
    await create_audit_log(db, current_user.id, "setting.update", "setting", setting.id)
    await db.commit()
    return setting
