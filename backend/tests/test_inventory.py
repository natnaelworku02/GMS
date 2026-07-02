import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def inv_setup(db_session):
    role = Role(name="StoreManager", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    user = User(phone="+251966000000", hashed_password=hash_password("password123"), full_name="Store Mgr", role_id=role.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}}


@pytest.mark.asyncio
async def test_create_location_and_item_with_stock(client: AsyncClient, inv_setup):
    h = inv_setup["headers"]
    loc = await client.post("/api/v1/inventory/locations", json={"name": "Main Store"}, headers=h)
    assert loc.status_code == 201
    loc_id = loc.json()["id"]

    item = await client.post("/api/v1/inventory/items", json={
        "part_name": "Headlight",
        "applicable_vehicle_types": ["Land Cruiser", "Yaris"],
        "unit_price": "150.00",
        "min_stock_threshold": 5,
    }, headers=h)
    assert item.status_code == 201
    item_id = item.json()["id"]

    stock = await client.put("/api/v1/inventory/stock", json={
        "item_id": item_id, "store_location_id": loc_id, "quantity": 20,
    }, headers=h)
    assert stock.status_code == 200
    assert stock.json()["quantity"] == 20

    detail = await client.get(f"/api/v1/inventory/items/{item_id}", headers=h)
    assert len(detail.json()["stock_entries"]) == 1
