from sqlalchemy import func, select
import pytest

from app.auth.models import Role, RolePermission, User
from app.config import Settings
from app.core.security import verify_password
from app.seed import ROLE_DEFINITIONS, seed_database


@pytest.mark.asyncio
async def test_seed_creates_idempotent_roles_and_users(db_session):
    settings = Settings(
        _env_file=None,
        admin_phone="+251900001000",
        admin_password="admin-password-123",
        seed_inventory_phone="+251900001001",
        seed_inventory_password="inventory-password-123",
        seed_tools_phone="+251900001002",
        seed_tools_password="tools-password-123",
        seed_job_cards_phone="+251900001003",
        seed_job_cards_password="jobs-password-123",
    )

    await seed_database(db_session, settings)
    await seed_database(db_session, settings)

    role_count = await db_session.scalar(select(func.count()).select_from(Role))
    user_count = await db_session.scalar(select(func.count()).select_from(User))
    permission_count = await db_session.scalar(select(func.count()).select_from(RolePermission))

    assert role_count == len(ROLE_DEFINITIONS)
    assert user_count == 4
    assert permission_count == 6

    inventory_role = await db_session.scalar(select(Role).where(Role.name == "Inventory Manager"))
    inventory_permission = await db_session.scalar(
        select(RolePermission).where(
            RolePermission.role_id == inventory_role.id,
            RolePermission.module == "inventory",
        )
    )
    assert inventory_permission.can_create is True
    assert inventory_permission.can_read is True
    assert inventory_permission.can_update is True
    assert inventory_permission.can_delete is True

    officer_role = await db_session.scalar(select(Role).where(Role.name == "Job Card Officer"))
    officer_permissions = {
        permission.module: permission
        for permission in (
            await db_session.scalars(
                select(RolePermission).where(RolePermission.role_id == officer_role.id)
            )
        ).all()
    }
    assert set(officer_permissions) == {"job_cards", "inventory", "tools", "hr"}
    assert officer_permissions["job_cards"].can_delete is False
    assert officer_permissions["inventory"].can_create is False
    assert officer_permissions["tools"].can_update is True
    assert officer_permissions["hr"].can_read is True

    admin = await db_session.scalar(select(User).where(User.phone == settings.admin_phone))
    assert verify_password(settings.admin_password, admin.hashed_password)


def test_cors_origins_are_normalized():
    settings = Settings(
        _env_file=None,
        cors_origins="http://localhost:3000/, https://gms-six-lyart.vercel.app/",
    )

    assert settings.cors_origin_list == [
        "http://localhost:3000",
        "https://gms-six-lyart.vercel.app",
    ]
