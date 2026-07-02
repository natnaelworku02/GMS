import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.hr.models import Employee
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def jc_setup(db_session):
    role = Role(name="JCAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251955000000", hashed_password=hash_password("password123"), full_name="JC Admin", role_id=role.id)
    db_session.add(user)
    mechanic = Employee(name="Ali", job_title="Mechanic", phone="+251900444444")
    db_session.add(mechanic)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(mechanic)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}, "mechanic": mechanic}


@pytest.mark.asyncio
async def test_owner_and_vehicle_crud(client: AsyncClient, jc_setup):
    h = jc_setup["headers"]
    resp = await client.post("/api/v1/owners", json={"name": "Ahmed", "phone": "+251911111111"}, headers=h)
    assert resp.status_code == 201
    owner_id = resp.json()["id"]

    resp = await client.post("/api/v1/vehicles", json={
        "owner_id": owner_id, "model": "Land Cruiser", "type": "SUV",
        "engine_number": "ENG001", "chassis_number": "CHS001", "plate_number": "AA-12345",
    }, headers=h)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_job_card_create_and_invalid_transition(client: AsyncClient, jc_setup):
    h = jc_setup["headers"]
    owner = await client.post("/api/v1/owners", json={"name": "Test", "phone": "+251933333333"}, headers=h)
    vehicle = await client.post("/api/v1/vehicles", json={
        "owner_id": owner.json()["id"], "model": "Yaris", "type": "Sedan",
        "engine_number": "ENG002", "chassis_number": "CHS002", "plate_number": "BB-54321",
    }, headers=h)

    jc_resp = await client.post("/api/v1/job-cards", json={
        "vehicle_id": vehicle.json()["id"], "owner_id": owner.json()["id"],
        "mileage_km": 50000, "description": "Full service",
        "conditions": [
            {"part_name": "trunk", "condition_state": "available"},
            {"part_name": "lh_body", "condition_state": "dent"},
        ],
        "mechanic_ids": [str(jc_setup["mechanic"].id)],
    }, headers=h)
    assert jc_resp.status_code == 201
    jc_id = jc_resp.json()["id"]
    assert jc_resp.json()["status"] == "pending_inspection"

    # Invalid: pending_inspection -> in_repair
    resp = await client.patch(f"/api/v1/job-cards/{jc_id}/status", json={"status": "in_repair"}, headers=h)
    assert resp.status_code == 422
