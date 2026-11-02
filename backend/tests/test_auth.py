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
async def test_login_is_rate_limited_after_repeated_failures(client: AsyncClient, seed_user):
    for _ in range(5):
        response = await client.post("/api/v1/auth/login", json={
            "phone": seed_user.phone,
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    blocked = await client.post("/api/v1/auth/login", json={
        "phone": seed_user.phone,
        "password": "password123",
    })
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, auth_headers, seed_role):
    response = await client.post("/api/v1/auth/users", json={
        "phone": "+251922000000",
        "password": "NewPass123!Secure",
        "full_name": "New User",
        "role_id": str(seed_role.id),
    }, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["phone"] == "+251922000000"


@pytest.mark.asyncio
async def test_rejects_weak_new_user_password(client: AsyncClient, auth_headers, seed_role):
    response = await client.post("/api/v1/auth/users", json={
        "phone": "+251922000001",
        "password": "newpass123",
        "full_name": "Weak Password User",
        "role_id": str(seed_role.id),
    }, headers=auth_headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_refresh_rotation_rejects_reuse(client: AsyncClient, seed_user):
    login = await client.post("/api/v1/auth/login", json={
        "phone": seed_user.phone,
        "password": "password123",
    })
    original_refresh = login.json()["refresh_token"]

    rotated = await client.post("/api/v1/auth/refresh", json={"refresh_token": original_refresh})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != original_refresh

    replay = await client.post("/api/v1/auth/refresh", json={"refresh_token": original_refresh})
    assert replay.status_code == 401

    revoked_rotation = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": rotated.json()["refresh_token"]},
    )
    assert revoked_rotation.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_access_session(client: AsyncClient, seed_user):
    login = await client.post("/api/v1/auth/login", json={
        "phone": seed_user.phone,
        "password": "password123",
    })
    tokens = login.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 200

    logout = await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert logout.status_code == 204
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers, seed_user):
    response = await client.get("/api/v1/auth/users", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["total"] >= 1
    assert data["page"] == 1
