import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.invoice.models import Invoice
from app.payments.models import Payment


async def get_invoice_summary(db: AsyncSession, invoice_id: uuid.UUID):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        return None
    result = await db.execute(
        select(Payment).where(Payment.invoice_id == invoice_id).order_by(Payment.created_at.desc())
    )
    payments = list(result.scalars().all())
    paid = sum((Decimal(str(item.amount)) for item in payments if item.status == "completed"), Decimal("0"))
    total = Decimal(str(invoice.grand_total))
    return {"invoice_id": invoice.id, "invoice_total": total, "paid_amount": paid,
            "balance": total - paid, "payments": payments}


async def create_payment(db: AsyncSession, invoice_id: uuid.UUID, amount: Decimal, user_id: uuid.UUID, **kwargs):
    summary = await get_invoice_summary(db, invoice_id)
    if not summary:
        raise ValueError("Invoice not found")
    if amount > summary["balance"]:
        raise ValueError("Payment exceeds the remaining invoice balance")
    payment = Payment(invoice_id=invoice_id, amount=amount, received_by=user_id, **kwargs)
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


async def reverse_payment(db: AsyncSession, payment_id: uuid.UUID, reason: str, user_id: uuid.UUID):
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise ValueError("Payment not found")
    if payment.status == "reversed":
        raise ValueError("Payment is already reversed")
    payment.status = "reversed"
    payment.reversed_at = datetime.now(timezone.utc)
    payment.reversed_by = user_id
    payment.reversal_reason = reason
    await db.commit()
    await db.refresh(payment)
    return payment
