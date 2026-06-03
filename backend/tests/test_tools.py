import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.hr.models import Employee
from app.job_cards.models import JobCard, JobStatus, Owner, Vehicle
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def tools_setup(db_session):
    role = Role(name="ToolsAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251988000000", hashed_password=hash_password("password123"), full_name="Tools Admin", role_id=role.id)
    db_session.add(user)
    mechanic = Employee(name="Hassan", job_title="Mechanic", phone="+251900666666")
    db_session.add(mechanic)
    owner = Owner(name="Tool Client", phone="+251900777777")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    vehicle = Vehicle(owner_id=owner.id, model="Hilux", type="Pickup", engine_number="E3", chassis_number="C3", plate_number="DD-99999")
    db_session.add(vehicle)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(mechanic)
    await db_session.refresh(vehicle)

    job_card = JobCard(
        vehicle_id=vehicle.id, owner_id=owner.id, status=JobStatus.IN_REPAIR.value,
        mileage_km=80000, description="Repair work", created_by=user.id,
    )
    db_session.add(job_card)
    await db_session.commit()
    await db_session.refresh(job_card)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "mechanic_id": str(mechanic.id),
        "job_card_id": str(job_card.id),
    }


@pytest.mark.asyncio
async def test_tool_checkout_and_return(client: AsyncClient, tools_setup):
    h = tools_setup["headers"]
    tool = await client.post("/api/v1/tools", json={
        "name": "Wrench Set", "specifications": "6-piece, metric", "total_quantity": 3,
    }, headers=h)
    assert tool.status_code == 201
    tool_id = tool.json()["id"]
    assert tool.json()["available_quantity"] == 3

    co = await client.post("/api/v1/tools/checkouts", json={
        "tool_id": tool_id, "employee_id": tools_setup["mechanic_id"],
        "job_card_id": tools_setup["job_card_id"], "quantity": 2,
    }, headers=h)
    assert co.status_code == 201
    checkout_id = co.json()["id"]

    detail = await client.get(f"/api/v1/tools/{tool_id}", headers=h)
    assert detail.json()["available_quantity"] == 1

    ret = await client.patch(f"/api/v1/tools/checkouts/{checkout_id}/return", headers=h)
    assert ret.status_code == 200
    assert ret.json()["checked_in_at"] is not None


@pytest.mark.asyncio
async def test_checkout_exceeds_available(client: AsyncClient, tools_setup):
    h = tools_setup["headers"]
    tool = await client.post("/api/v1/tools", json={"name": "Screwdriver", "total_quantity": 1}, headers=h)
    tool_id = tool.json()["id"]

    await client.post("/api/v1/tools/checkouts", json={
        "tool_id": tool_id, "employee_id": tools_setup["mechanic_id"],
        "job_card_id": tools_setup["job_card_id"], "quantity": 1,
    }, headers=h)

    resp = await client.post("/api/v1/tools/checkouts", json={
        "tool_id": tool_id, "employee_id": tools_setup["mechanic_id"],
        "job_card_id": tools_setup["job_card_id"], "quantity": 1,
    }, headers=h)
    assert resp.status_code == 422
