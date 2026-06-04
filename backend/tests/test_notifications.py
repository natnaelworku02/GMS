import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.notifications.models import Notification
from app.core.security import hash_password, create_access_token


@pytest_asyncio.fixture
async def notif_setup(db_session):
    role = Role(name="NotifAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)

    user = User(phone="+251999000000", hashed_password=hash_password("password123"), full_name="Notif User", role_id=role.id)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    notif = Notification(user_id=user.id, title="Low Stock", message="Headlight stock below threshold", entity_type="inventory_item")
    db_session.add(notif)
    await db_session.commit()
    await db_session.refresh(notif)

    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}, "notification_id": str(notif.id)}


@pytest.mark.asyncio
async def test_list_notifications(client: AsyncClient, notif_setup):
    resp = await client.get("/api/v1/notifications", headers=notif_setup["headers"])
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_mark_notification_read(client: AsyncClient, notif_setup):
    nid = notif_setup["notification_id"]
    resp = await client.patch(f"/api/v1/notifications/{nid}/read", headers=notif_setup["headers"])
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    resp2 = await client.get("/api/v1/notifications?unread=true", headers=notif_setup["headers"])
    ids = [n["id"] for n in resp2.json()]
    assert nid not in ids
