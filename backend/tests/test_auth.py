import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.auth.models import Role, User


# --- Unit tests ---

def test_hash_and_verify_password():
    password = "testpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_and_decode_access_token():
    data = {"user_id": "abc-123", "role_id": "role-456"}
    token = create_access_token(data)
    payload = decode_token(token)
    assert payload["user_id"] == "abc-123"
    assert payload["role_id"] == "role-456"
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    data = {"user_id": "abc-123", "role_id": "role-456"}
    token = create_refresh_token(data)
    payload = decode_token(token)
    assert payload["user_id"] == "abc-123"
    assert payload["type"] == "refresh"


# --- Integration tests ---

@pytest_asyncio.fixture
async def seed_role(db_session):
    role = Role(name="Admin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    return role


@pytest_asyncio.fixture
async def seed_user(db_session, seed_role):
    user = User(
        phone="+251911000000",
        hashed_password=hash_password("password123"),
        full_name="Test Admin",
        role_id=seed_role.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(seed_user):
    token = create_access_token({"user_id": str(seed_user.id), "role_id": str(seed_user.role_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_user):
    response = await client.post("/api/v1/auth/login", json={
        "phone": "+251911000000",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, seed_user):
    response = await client.post("/api/v1/auth/login", json={
        "phone": "+251911000000",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, auth_headers, seed_role):
    response = await client.post("/api/v1/auth/users", json={
        "phone": "+251922000000",
        "password": "newpass123",
        "full_name": "New User",
        "role_id": str(seed_role.id),
    }, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["phone"] == "+251922000000"


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers, seed_user):
    response = await client.get("/api/v1/auth/users", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1
