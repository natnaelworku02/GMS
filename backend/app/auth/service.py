import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import Role, RolePermission, SystemSetting, User
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token


async def authenticate_user(db: AsyncSession, phone: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone, User.is_active == True))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.hashed_password):
        return user
    return None


def create_tokens(user: User) -> dict:
    data = {"user_id": str(user.id), "role_id": str(user.role_id)}
    return {
        "access_token": create_access_token(data),
        "refresh_token": create_refresh_token(data),
        "token_type": "bearer",
    }


async def create_user(db: AsyncSession, phone: str, password: str, full_name: str, role_id: uuid.UUID) -> User:
    user = User(
        phone=phone,
        hashed_password=hash_password(password),
        full_name=full_name,
        role_id=role_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def update_user(db: AsyncSession, user: User, **kwargs) -> User:
    for key, value in kwargs.items():
        if value is not None:
            setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


async def reset_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    await db.commit()
    await db.refresh(user)
    return user


async def create_role(db: AsyncSession, name: str, is_superadmin: bool = False) -> Role:
    role = Role(name=name, is_superadmin=is_superadmin)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


async def get_role(db: AsyncSession, role_id: uuid.UUID) -> Role | None:
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    )
    return result.scalar_one_or_none()


async def list_roles(db: AsyncSession) -> list[Role]:
    result = await db.execute(select(Role).options(selectinload(Role.permissions)).order_by(Role.name))
    return list(result.scalars().all())


async def set_role_permissions(db: AsyncSession, role_id: uuid.UUID, permissions: list[dict]) -> Role:
    role = await get_role(db, role_id)
    if not role:
        return None
    for perm in role.permissions:
        await db.delete(perm)
    for perm_data in permissions:
        perm = RolePermission(role_id=role_id, **perm_data)
        db.add(perm)
    await db.commit()
    return await get_role(db, role_id)


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
    await db.commit()
    await db.refresh(setting)
    return setting
