import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, RolePermission, User
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def limited_role(db_session):
    role = Role(name="Receptionist", is_superadmin=False)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    perm = RolePermission(role_id=role.id, module="job_cards", can_read=True)
    db_session.add(perm)
    await db_session.commit()
    return role


@pytest_asyncio.fixture
async def limited_user(db_session, limited_role):
    user = User(
        phone="+251933000000",
        hashed_password=hash_password("password123"),
        full_name="Receptionist",
        role_id=limited_role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def limited_headers(limited_user):
    token = create_access_token({"user_id": str(limited_user.id), "role_id": str(limited_user.role_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_rbac_denies_unauthorized_access(client: AsyncClient, limited_headers):
    response = await client.get("/api/v1/auth/users", headers=limited_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_rbac_no_token_returns_403(client: AsyncClient):
    response = await client.get("/api/v1/auth/users")
    assert response.status_code == 403
