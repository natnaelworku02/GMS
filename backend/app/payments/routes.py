import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.payments import schemas, service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/invoice/{invoice_id}", response_model=schemas.PaymentSummary)
async def invoice_payments(invoice_id: uuid.UUID, _user=Depends(RequirePermission("performa", "read")), db: AsyncSession = Depends(get_db)):
    summary = await service.get_invoice_summary(db, invoice_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return summary


@router.post("/", response_model=schemas.PaymentResponse, status_code=201)
async def create_payment(body: schemas.PaymentCreate, current_user: User = Depends(RequirePermission("performa", "update")), db: AsyncSession = Depends(get_db)):
    try:
        payment = await service.create_payment(
            db, body.invoice_id, body.amount, current_user.id,
            payment_method=body.payment_method, reference=body.reference, notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    await create_audit_log(db, current_user.id, "payment.create", "invoice", body.invoice_id,
                           details={"payment_id": str(payment.id), "amount": str(body.amount)})
    await db.commit()
    return payment


@router.post("/{payment_id}/reverse", response_model=schemas.PaymentResponse)
async def reverse_payment(payment_id: uuid.UUID, body: schemas.PaymentReverse, current_user: User = Depends(RequirePermission("performa", "update")), db: AsyncSession = Depends(get_db)):
    try:
        payment = await service.reverse_payment(db, payment_id, body.reason, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    await create_audit_log(db, current_user.id, "payment.reverse", "invoice", payment.invoice_id,
                           details={"payment_id": str(payment.id), "reason": body.reason})
    await db.commit()
    return payment
