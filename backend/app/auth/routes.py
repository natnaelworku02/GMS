import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import schemas, service
from app.auth.models import SystemSetting, User
from app.core.audit import create_audit_log
from app.core.deps import get_current_user
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.core.security import decode_token
from app.db import get_db, get_redis

router = APIRouter(prefix="/auth", tags=["auth"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])


# --- Auth ---

@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    body: schemas.LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    client_host = request.client.host if request.client else "unknown"
    rate_key = f"{client_host}:{body.phone}"
    await service.enforce_login_limit(redis, rate_key)
    user = await service.authenticate_user(db, body.phone, body.password)
    if not user:
        await service.record_login_failure(redis, rate_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    await service.clear_login_failures(redis, rate_key)
    tokens = await service.create_session_tokens(db, user)
    await create_audit_log(db, user.id, "auth.login", "user", user.id, {"ip": client_host})
    await db.commit()
    return tokens


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh(body: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return await service.rotate_session_tokens(db, body.refresh_token, payload)


@router.post("/logout", status_code=204)
async def logout(body: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    session_id = payload.get("session_id")
    user_id = payload.get("user_id")
    if session_id:
        await service.revoke_session(db, uuid.UUID(session_id))
    if user_id:
        await create_audit_log(db, uuid.UUID(user_id), "auth.logout", "user", uuid.UUID(user_id))
        await db.commit()


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
    await service.ensure_role_assignment_allowed(db, current_user, body.role_id)
    user = await service.create_user(db, body.phone, body.password, body.full_name, body.role_id)
    await create_audit_log(
        db,
        current_user.id,
        "user.create",
        "user",
        user.id,
        {"role_id": str(body.role_id), "phone": body.phone},
    )
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
    changes = body.model_dump(exclude_unset=True)
    await service.ensure_user_management_allowed(db, current_user, user)
    if body.role_id is not None:
        await service.ensure_role_assignment_allowed(db, current_user, body.role_id)
    await service.ensure_user_security_change_allowed(
        db,
        user,
        new_role_id=body.role_id,
        new_is_active=body.is_active,
    )
    previous = {"role_id": str(user.role_id), "is_active": user.is_active}
    updated = await service.update_user(db, user, **changes)
    await create_audit_log(
        db,
        current_user.id,
        "user.update",
        "user",
        user.id,
        {"changed_fields": sorted(changes), "previous": previous},
    )
    await db.commit()
    return updated


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("users", "delete")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=409, detail="You cannot delete your own account")
    user = await service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await service.ensure_user_management_allowed(db, current_user, user)
    await service.ensure_user_security_change_allowed(db, user, deleting=True)
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
    await service.ensure_user_management_allowed(db, current_user, user)
    await service.reset_password(db, user, body.new_password)
    await create_audit_log(db, current_user.id, "user.password_reset", "user", user.id)
    await db.commit()
    return {"detail": "Password reset successfully"}


# --- Roles ---

@roles_router.post("/", response_model=schemas.RoleResponse, status_code=201)
async def create_role(
    body: schemas.RoleCreate,
    current_user: User = Depends(RequirePermission("roles", "create")),
    db: AsyncSession = Depends(get_db),
):
    await service.ensure_role_creation_allowed(db, current_user, body.is_superadmin)
    role = await service.create_role(db, body.name, body.is_superadmin)
    await create_audit_log(
        db,
        current_user.id,
        "role.create",
        "role",
        role.id,
        {"name": body.name, "is_superadmin": body.is_superadmin},
    )
    await db.commit()
    return role


@roles_router.get("/", response_model=PaginatedResponse[schemas.RoleResponse])
async def list_roles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    _user=Depends(RequirePermission("roles", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_roles(db, page, page_size, search)


@roles_router.get("/{role_id}", response_model=schemas.RoleResponse)
async def get_role(
    role_id: uuid.UUID,
    _user=Depends(RequirePermission("roles", "read")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@roles_router.delete("/{role_id}", status_code=204)
async def delete_role(
    role_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("roles", "delete")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await service.ensure_role_management_allowed(db, current_user, role)
    await service.delete_role(db, role_id)
    await create_audit_log(db, current_user.id, "role.delete", "role", role_id)
    await db.commit()


@roles_router.put("/{role_id}/permissions", response_model=schemas.RoleResponse)
async def set_permissions(
    role_id: uuid.UUID,
    body: list[schemas.PermissionSet],
    current_user: User = Depends(RequirePermission("roles", "update")),
    db: AsyncSession = Depends(get_db),
):
    role = await service.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    permission_data = [p.model_dump() for p in body]
    await service.ensure_permission_grants_allowed(db, current_user, role, permission_data)
    role = await service.set_role_permissions(db, role_id, permission_data)
    await create_audit_log(
        db,
        current_user.id,
        "role.permissions_update",
        "role",
        role_id,
        {"permissions": permission_data},
    )
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
    previous = await service.get_setting(db, key)
    previous_value = previous.value if previous else None
    setting = await service.upsert_setting(db, key, body.value)
    await create_audit_log(
        db,
        current_user.id,
        "setting.update",
        "setting",
        setting.id,
        {"key": key, "previous_value": previous_value, "new_value": body.value},
    )
    await db.commit()
    return setting
