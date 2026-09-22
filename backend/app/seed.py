import asyncio
from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, RolePermission, SystemSetting, User
from app.config import Settings, get_settings
from app.core.security import hash_password
from app.db import async_session


@dataclass(frozen=True)
class SeedRole:
    is_superadmin: bool
    permissions: dict[str, tuple[bool, bool, bool, bool]]


# Permission tuple order: create, read, update, delete.
ROLE_DEFINITIONS = {
    "Super Admin": SeedRole(is_superadmin=True, permissions={}),
    "Inventory Manager": SeedRole(
        is_superadmin=False,
        permissions={"inventory": (True, True, True, True)},
    ),
    "Tools Manager": SeedRole(
        is_superadmin=False,
        permissions={"tools": (True, True, True, True)},
    ),
    "Job Card Officer": SeedRole(
        is_superadmin=False,
        permissions={
            "job_cards": (True, True, True, False),
            "inventory": (False, True, True, False),
            "tools": (False, True, True, False),
            "hr": (False, True, False, False),
        },
    ),
}


async def ensure_role(db: AsyncSession, name: str, definition: SeedRole) -> Role:
    result = await db.execute(select(Role).where(Role.name == name))
    role = result.scalar_one_or_none()
    if role is None:
        role = Role(name=name, is_superadmin=definition.is_superadmin)
        db.add(role)
        await db.flush()
        print(f"Created '{name}' role")
    else:
        role.is_superadmin = definition.is_superadmin

    await db.execute(delete(RolePermission).where(RolePermission.role_id == role.id))
    for module, (can_create, can_read, can_update, can_delete) in definition.permissions.items():
        db.add(
            RolePermission(
                role_id=role.id,
                module=module,
                can_create=can_create,
                can_read=can_read,
                can_update=can_update,
                can_delete=can_delete,
            )
        )
    return role


async def ensure_user(
    db: AsyncSession,
    *,
    phone: str,
    password: str | None,
    full_name: str,
    role: Role,
    required: bool = False,
) -> None:
    if not password:
        if required:
            raise RuntimeError(f"A password is required for seed user {full_name}")
        print(f"Skipped '{full_name}' user; no password configured")
        return

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        db.add(
            User(
                phone=phone,
                hashed_password=hash_password(password),
                full_name=full_name,
                role_id=role.id,
            )
        )
        print(f"Created '{full_name}' user with phone: {phone}")
    else:
        user.full_name = full_name
        user.role_id = role.id
        user.is_active = True


async def seed_database(db: AsyncSession, settings: Settings) -> None:
    roles = {
        name: await ensure_role(db, name, definition)
        for name, definition in ROLE_DEFINITIONS.items()
    }

    await ensure_user(
        db,
        phone=settings.admin_phone,
        password=settings.admin_password,
        full_name="System Administrator",
        role=roles["Super Admin"],
        required=True,
    )
    await ensure_user(
        db,
        phone=settings.seed_inventory_phone,
        password=settings.seed_inventory_password,
        full_name="Inventory Manager",
        role=roles["Inventory Manager"],
    )
    await ensure_user(
        db,
        phone=settings.seed_tools_phone,
        password=settings.seed_tools_password,
        full_name="Tools Manager",
        role=roles["Tools Manager"],
    )
    await ensure_user(
        db,
        phone=settings.seed_job_cards_phone,
        password=settings.seed_job_cards_password,
        full_name="Job Card Officer",
        role=roles["Job Card Officer"],
    )

    result = await db.execute(select(SystemSetting).where(SystemSetting.key == "vat_rate"))
    if not result.scalar_one_or_none():
        db.add(SystemSetting(key="vat_rate", value="15.0"))
        print("Created default VAT rate setting: 15.0%")

    await db.commit()


async def seed() -> None:
    settings = get_settings()
    async with async_session() as db:
        await seed_database(db, settings)
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
