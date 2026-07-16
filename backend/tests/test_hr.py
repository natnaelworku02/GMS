import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def admin_setup(db_session):
    role = Role(name="HRAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    user = User(phone="+251944000000", hashed_password=hash_password("password123"), full_name="HR Admin", role_id=role.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}}


@pytest.mark.asyncio
async def test_create_employee(client: AsyncClient, admin_setup):
    resp = await client.post("/api/v1/hr/employees", json={
        "name": "John Mechanic", "job_title": "Mechanic", "phone": "+251900111111",
    }, headers=admin_setup["headers"])
    assert resp.status_code == 201
    assert resp.json()["name"] == "John Mechanic"


@pytest.mark.asyncio
async def test_list_employees(client: AsyncClient, admin_setup):
    await client.post("/api/v1/hr/employees", json={
        "name": "Jane", "job_title": "Electrician", "phone": "+251900222222",
    }, headers=admin_setup["headers"])
    resp = await client.get("/api/v1/hr/employees", headers=admin_setup["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_update_employee(client: AsyncClient, admin_setup):
    h = admin_setup["headers"]
    create_resp = await client.post("/api/v1/hr/employees", json={
        "name": "Bob", "job_title": "Mechanic", "phone": "+251900333333",
    }, headers=h)
    emp_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/v1/hr/employees/{emp_id}", json={"is_active": False}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
