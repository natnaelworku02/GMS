from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.auth.models import Role, User
from app.core.security import create_access_token, hash_password
from app.invoice.models import Invoice
from app.job_cards.models import JobCard, Owner, Vehicle
from app.performa.models import Performa


@pytest_asyncio.fixture
async def payment_setup(db_session):
    role = Role(name="PaymentAdmin", is_superadmin=True)
    db_session.add(role)
    await db_session.flush()
    user = User(phone="+251988000000", hashed_password=hash_password("password123"), full_name="Payment Admin", role_id=role.id)
    owner = Owner(name="Payment Client", phone="+251988111111")
    db_session.add_all([user, owner])
    await db_session.flush()
    vehicle = Vehicle(owner_id=owner.id, model="Test", type="Sedan", engine_number="PE1", chassis_number="PC1", plate_number="PAY-001")
    db_session.add(vehicle)
    await db_session.flush()
    job = JobCard(vehicle_id=vehicle.id, owner_id=owner.id, mileage_km=1, description="Payment job", created_by=user.id)
    db_session.add(job)
    await db_session.flush()
    performa = Performa(vehicle_id=vehicle.id, job_card_id=job.id, subtotal=Decimal("1000"), vat_amount=Decimal("150"), grand_total=Decimal("1150"), status="approved")
    db_session.add(performa)
    await db_session.flush()
    invoice = Invoice(performa_id=performa.id, job_card_id=job.id, invoice_number="INV-PAY-1", subtotal=Decimal("1000"), vat_amount=Decimal("150"), grand_total=Decimal("1150"))
    db_session.add(invoice)
    await db_session.commit()
    token = create_access_token({"user_id": str(user.id), "role_id": str(role.id)})
    return {"headers": {"Authorization": f"Bearer {token}"}, "invoice_id": str(invoice.id)}


@pytest.mark.asyncio
async def test_partial_payment_balance_and_reversal(client: AsyncClient, payment_setup):
    headers = payment_setup["headers"]
    invoice_id = payment_setup["invoice_id"]
    created = await client.post("/api/v1/payments/", json={
        "invoice_id": invoice_id, "amount": "400", "payment_method": "cash", "reference": "RCPT-1",
    }, headers=headers)
    assert created.status_code == 201

    summary = await client.get(f"/api/v1/payments/invoice/{invoice_id}", headers=headers)
    assert summary.status_code == 200
    assert Decimal(summary.json()["paid_amount"]) == Decimal("400")
    assert Decimal(summary.json()["balance"]) == Decimal("750")

    overpayment = await client.post("/api/v1/payments/", json={
        "invoice_id": invoice_id, "amount": "800", "payment_method": "cash",
    }, headers=headers)
    assert overpayment.status_code == 422

    reversed_payment = await client.post(
        f"/api/v1/payments/{created.json()['id']}/reverse", json={"reason": "Incorrect amount"}, headers=headers
    )
    assert reversed_payment.status_code == 200
    summary = await client.get(f"/api/v1/payments/invoice/{invoice_id}", headers=headers)
    assert Decimal(summary.json()["paid_amount"]) == Decimal("0")
    assert Decimal(summary.json()["balance"]) == Decimal("1150")
