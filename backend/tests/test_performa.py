import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, SystemSetting, User
from app.job_cards.models import JobCard, JobStatus, Owner, Vehicle
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def perf_setup(db_session):
    role = Role(name="PerfAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251977000000", hashed_password=hash_password("password123"), full_name="Perf Admin", role_id=role.id)
    db_session.add(user)
    setting = SystemSetting(key="vat_rate", value="15.0")
    db_session.add(setting)
    owner = Owner(name="Client A", phone="+251900555555")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    vehicle = Vehicle(owner_id=owner.id, model="Corolla", type="Sedan", engine_number="E1", chassis_number="C1", plate_number="CC-11111")
    db_session.add(vehicle)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(vehicle)

    job_card = JobCard(
        vehicle_id=vehicle.id, owner_id=owner.id, status=JobStatus.PENDING_INSPECTION.value,
        mileage_km=30000, description="Test job", created_by=user.id,
    )
    db_session.add(job_card)
    await db_session.commit()
    await db_session.refresh(job_card)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}, "job_card_id": str(job_card.id)}


@pytest.mark.asyncio
async def test_create_performa_with_vat(client: AsyncClient, perf_setup):
    h = perf_setup["headers"]
    resp = await client.post("/api/v1/performas", json={
        "job_card_id": perf_setup["job_card_id"],
        "client_email": "client@example.com",
        "line_items": [
            {"type": "repair", "description": "Full body paint", "unit_price": "1000.00", "quantity": 1},
            {"type": "repair", "description": "Interior cleaning", "unit_price": "500.00", "quantity": 1},
        ],
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["version"] == 1
    assert float(data["subtotal"]) == 1500.0
    assert float(data["vat_rate"]) == 15.0
    assert float(data["vat_amount"]) == 225.0
    assert float(data["grand_total"]) == 1725.0
    assert len(data["line_items"]) == 2


@pytest.mark.asyncio
async def test_revise_performa_increments_version(client: AsyncClient, perf_setup):
    h = perf_setup["headers"]
    resp1 = await client.post("/api/v1/performas", json={
        "job_card_id": perf_setup["job_card_id"],
        "line_items": [{"type": "repair", "description": "Paint", "unit_price": "1000.00"}],
    }, headers=h)
    perf_id = resp1.json()["id"]

    resp2 = await client.post(f"/api/v1/performas/{perf_id}/revise", json={
        "job_card_id": perf_setup["job_card_id"],
        "line_items": [{"type": "repair", "description": "Paint reduced", "unit_price": "800.00"}],
    }, headers=h)
    assert resp2.status_code == 201
    assert resp2.json()["version"] == 2
