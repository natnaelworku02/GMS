import asyncio

from sqlalchemy import select

from app.auth.models import Role, SystemSetting, User
from app.config import get_settings
from app.core.security import hash_password
from app.db import async_session


async def seed():
    settings = get_settings()
    async with async_session() as db:
        result = await db.execute(select(Role).where(Role.name == "Super Admin"))
        role = result.scalar_one_or_none()

        if not role:
            role = Role(name="Super Admin", is_superadmin=True)
            db.add(role)
            await db.flush()
            print("Created 'Super Admin' role")

        result = await db.execute(select(User).where(User.phone == settings.admin_phone))
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                phone=settings.admin_phone,
                hashed_password=hash_password(settings.admin_password),
                full_name="System Administrator",
                role_id=role.id,
            )
            db.add(admin)
            print(f"Created admin user with phone: {settings.admin_phone}")

        result = await db.execute(select(SystemSetting).where(SystemSetting.key == "vat_rate"))
        if not result.scalar_one_or_none():
            db.add(SystemSetting(key="vat_rate", value="15.0"))
            print("Created default VAT rate setting: 15.0%")

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
