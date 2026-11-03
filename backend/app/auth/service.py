import uuid
from datetime import datetime, timedelta, timezone
from hmac import compare_digest

from fastapi import HTTPException
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import RefreshSession, Role, RolePermission, SystemSetting, User
from app.config import get_settings
from app.core.pagination import paginate_query
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, hash_token
from app.core.permissions import PERMISSION_MODULES


async def authenticate_user(db: AsyncSession, phone: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone, User.is_active == True))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.hashed_password):
        return user
    return None


async def create_session_tokens(db: AsyncSession, user: User) -> dict:
    settings = get_settings()
    session = RefreshSession(
        user_id=user.id,
        token_hash="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(session)
    await db.flush()
    data = {"user_id": str(user.id), "role_id": str(user.role_id), "session_id": str(session.id)}
    refresh_token = create_refresh_token(data)
    session.token_hash = hash_token(refresh_token)
    await db.flush()
    return {
        "access_token": create_access_token(data),
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


async def rotate_session_tokens(db: AsyncSession, refresh_token: str, payload: dict) -> dict:
    session_id = payload.get("session_id")
    user_id = payload.get("user_id")
    if not session_id or not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh session")

    session = await db.scalar(select(RefreshSession).where(RefreshSession.id == uuid.UUID(session_id)))
    now = datetime.now(timezone.utc)
    expires_at = session.expires_at if session else None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not session or session.user_id != uuid.UUID(user_id) or session.revoked_at or expires_at <= now:
        raise HTTPException(status_code=401, detail="Refresh session expired or revoked")
    if not compare_digest(session.token_hash, hash_token(refresh_token)):
        session.revoked_at = now
        await db.commit()
        raise HTTPException(status_code=401, detail="Refresh token reuse detected")

    user = await get_user(db, session.user_id)
    if not user or not user.is_active:
        session.revoked_at = now
        await db.commit()
        raise HTTPException(status_code=401, detail="User not found or inactive")

    settings = get_settings()
    session.last_used_at = now
    session.expires_at = now + timedelta(days=settings.jwt_refresh_token_expire_days)
    data = {"user_id": str(user.id), "role_id": str(user.role_id), "session_id": str(session.id)}
    new_refresh_token = create_refresh_token(data)
    session.token_hash = hash_token(new_refresh_token)
    await db.commit()
    return {
        "access_token": create_access_token(data),
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


async def revoke_session(db: AsyncSession, session_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshSession)
        .where(RefreshSession.id == session_id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    await db.flush()


async def revoke_user_sessions(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshSession)
        .where(RefreshSession.user_id == user_id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    await db.commit()


async def enforce_login_limit(redis: Redis, client_key: str) -> None:
    settings = get_settings()
    key = f"auth:login:{client_key}"
    try:
        attempts = await redis.get(key)
        if attempts and int(attempts) >= settings.login_attempt_limit:
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    except RedisError:
        return


async def record_login_failure(redis: Redis, client_key: str) -> None:
    settings = get_settings()
    key = f"auth:login:{client_key}"
    try:
        attempts = await redis.incr(key)
        if attempts == 1:
            await redis.expire(key, settings.login_attempt_window_seconds)
    except RedisError:
        return


async def clear_login_failures(redis: Redis, client_key: str) -> None:
    try:
        await redis.delete(f"auth:login:{client_key}")
    except RedisError:
        return


async def create_user(db: AsyncSession, phone: str, password: str, full_name: str, role_id: uuid.UUID) -> User:
    user = User(
        phone=phone,
        hashed_password=hash_password(password),
        full_name=full_name,
        role_id=role_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None, is_active: bool | None = None):
    query = select(User).order_by(User.created_at.desc())
    if search:
        query = query.where(or_(User.full_name.ilike(f"%{search}%"), User.phone.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def update_user(db: AsyncSession, user: User, **kwargs) -> User:
    security_changed = (
        ("role_id" in kwargs and kwargs["role_id"] is not None and kwargs["role_id"] != user.role_id)
        or ("is_active" in kwargs and kwargs["is_active"] is False and user.is_active)
    )
    for key, value in kwargs.items():
        if value is not None:
            setattr(user, key, value)
    if security_changed:
        await db.execute(delete(RefreshSession).where(RefreshSession.user_id == user.id))
    await db.flush()
    await db.refresh(user)
    return user


async def reset_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    await db.execute(delete(RefreshSession).where(RefreshSession.user_id == user.id))
    await db.flush()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user_id: uuid.UUID):
    from app.audit.models import AuditLog
    from app.job_cards.models import JobCard
    result = await db.execute(select(JobCard).where(JobCard.created_by == user_id).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete user: user created job cards")
    audit_result = await db.execute(select(AuditLog.id).where(AuditLog.user_id == user_id).limit(1))
    if audit_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete an audited user; deactivate the account instead")
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.execute(delete(RefreshSession).where(RefreshSession.user_id == user_id))
    await db.delete(user)
    await db.flush()


async def create_role(db: AsyncSession, name: str, is_superadmin: bool = False) -> Role:
    role = Role(name=name, is_superadmin=is_superadmin)
    db.add(role)
    await db.flush()
    await db.refresh(role, ["permissions"])
    return role


async def get_role(db: AsyncSession, role_id: uuid.UUID) -> Role | None:
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    )
    return result.scalar_one_or_none()


async def ensure_role_assignment_allowed(db: AsyncSession, actor: User, role_id: uuid.UUID) -> Role:
    actor_role = await get_role(db, actor.role_id)
    target_role = await get_role(db, role_id)
    if not target_role:
        raise HTTPException(status_code=404, detail="Role not found")
    if actor_role and actor_role.is_superadmin:
        return target_role
    if target_role.is_superadmin:
        raise HTTPException(status_code=403, detail="Only a super administrator can assign that role")

    actor_permissions = {
        permission.module: permission
        for permission in (actor_role.permissions if actor_role else [])
    }
    for permission in target_role.permissions:
        actor_permission = actor_permissions.get(permission.module)
        for action in ("create", "read", "update", "delete"):
            if getattr(permission, f"can_{action}") and not (
                actor_permission and getattr(actor_permission, f"can_{action}")
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Cannot assign a role with permissions you do not possess",
                )
    return target_role


async def actor_is_superadmin(db: AsyncSession, actor: User) -> bool:
    role = await get_role(db, actor.role_id)
    return bool(role and role.is_superadmin)


async def ensure_user_management_allowed(db: AsyncSession, actor: User, target: User) -> None:
    if await actor_is_superadmin(db, actor):
        return
    target_role = await get_role(db, target.role_id)
    if target_role and target_role.is_superadmin:
        raise HTTPException(status_code=403, detail="Only a super administrator can manage that user")
    actor_role = await get_role(db, actor.role_id)
    actor_permissions = {
        permission.module: permission
        for permission in (actor_role.permissions if actor_role else [])
    }
    for permission in target_role.permissions if target_role else []:
        actor_permission = actor_permissions.get(permission.module)
        for action in ("create", "read", "update", "delete"):
            if getattr(permission, f"can_{action}") and not (
                actor_permission and getattr(actor_permission, f"can_{action}")
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Cannot manage a user whose permissions exceed your own",
                )


async def ensure_role_creation_allowed(db: AsyncSession, actor: User, is_superadmin: bool) -> None:
    if is_superadmin and not await actor_is_superadmin(db, actor):
        raise HTTPException(status_code=403, detail="Only a super administrator can create that role")


async def ensure_role_management_allowed(db: AsyncSession, actor: User, target_role: Role) -> None:
    if target_role.is_superadmin and not await actor_is_superadmin(db, actor):
        raise HTTPException(status_code=403, detail="Only a super administrator can manage that role")


async def ensure_permission_grants_allowed(
    db: AsyncSession,
    actor: User,
    target_role: Role,
    permissions: list[dict],
) -> None:
    await ensure_role_management_allowed(db, actor, target_role)
    if await actor_is_superadmin(db, actor):
        return

    actor_role = await get_role(db, actor.role_id)
    actor_permissions = {
        permission.module: permission
        for permission in (actor_role.permissions if actor_role else [])
    }
    for permission in permissions:
        if permission["module"] not in PERMISSION_MODULES:
            raise HTTPException(status_code=422, detail="Unknown permission module")
        actor_permission = actor_permissions.get(permission["module"])
        for action in ("create", "read", "update", "delete"):
            if permission.get(f"can_{action}") and not (
                actor_permission and getattr(actor_permission, f"can_{action}")
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Cannot grant permissions you do not possess",
                )


async def ensure_user_security_change_allowed(
    db: AsyncSession,
    user: User,
    *,
    new_role_id: uuid.UUID | None = None,
    new_is_active: bool | None = None,
    deleting: bool = False,
) -> None:
    current_role = await get_role(db, user.role_id)
    if not current_role or not current_role.is_superadmin or not user.is_active:
        return

    removes_superadmin = deleting or new_is_active is False
    if new_role_id is not None:
        new_role = await get_role(db, new_role_id)
        removes_superadmin = removes_superadmin or not new_role or not new_role.is_superadmin
    if not removes_superadmin:
        return

    active_superadmins = await db.scalar(
        select(func.count())
        .select_from(User)
        .join(Role, User.role_id == Role.id)
        .where(User.is_active.is_(True), Role.is_superadmin.is_(True))
    )
    if (active_superadmins or 0) <= 1:
        raise HTTPException(status_code=409, detail="The final active super administrator is protected")


async def list_roles(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None):
    query = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    if search:
        query = query.where(Role.name.ilike(f"%{search}%"))
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def delete_role(db: AsyncSession, role_id: uuid.UUID):
    result = await db.execute(select(User).where(User.role_id == role_id).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete role: users are assigned to it")
    role = await get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await db.delete(role)
    await db.flush()


async def set_role_permissions(db: AsyncSession, role_id: uuid.UUID, permissions: list[dict]) -> Role:
    role = await get_role(db, role_id)
    if not role:
        return None
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(RolePermission).where(RolePermission.role_id == role_id))
    for perm_data in permissions:
        perm = RolePermission(role_id=role_id, **perm_data)
        db.add(perm)
    await db.flush()
    await db.refresh(role, ["permissions"])
    return role


async def check_permission(db: AsyncSession, role_id: uuid.UUID, module: str, action: str) -> bool:
    role = await get_role(db, role_id)
    if not role:
        return False
    if role.is_superadmin:
        return True
    for perm in role.permissions:
        if perm.module == module:
            return getattr(perm, f"can_{action}", False)
    return False


async def get_setting(db: AsyncSession, key: str) -> SystemSetting | None:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    return result.scalar_one_or_none()


async def upsert_setting(db: AsyncSession, key: str, value: str) -> SystemSetting:
    setting = await get_setting(db, key)
    if setting:
        setting.value = value
    else:
        setting = SystemSetting(key=key, value=value)
        db.add(setting)
    await db.flush()
    await db.refresh(setting)
    return setting
