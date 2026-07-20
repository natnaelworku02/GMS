import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pdf import render_pdf

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.db import get_db
from app.invoice import schemas, service
from app.performa.service import get_performa

router = APIRouter(prefix="/invoices", tags=["invoice"])


@router.post("/from-performa", response_model=schemas.InvoiceResponse, status_code=201)
async def create_invoice_from_performa(
    body: schemas.InvoiceCreateFromPerforma,
    current_user: User = Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    performa = await get_performa(db, body.performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")
    if performa.status != "approved":
        raise HTTPException(status_code=422, detail="Performa must be approved before creating an invoice")

    invoice = await service.create_invoice_from_performa(db, performa)
    await create_audit_log(db, current_user.id, "invoice.create", "invoice", invoice.id,
                           details={"performa_id": str(body.performa_id)})
    await db.commit()
    return invoice


@router.get("/", response_model=PaginatedResponse[schemas.InvoiceResponse])
async def list_invoices(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_invoices(db, page, page_size, search)


@router.get("/by-performa/{performa_id}", response_model=schemas.InvoiceResponse | None)
async def get_invoice_by_performa(
    performa_id: uuid.UUID,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    from app.invoice.models import Invoice
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.line_items))
        .where(Invoice.performa_id == performa_id)
    )
    invoice = result.scalar_one_or_none()
    return invoice


@router.get("/{invoice_id}", response_model=schemas.InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: uuid.UUID,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    invoice = await service.get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    fmt = lambda n: f"{Decimal(str(n)):,.2f}"

    items = []
    for li in invoice.line_items:
        items.append({
            "type": li.type,
            "description": li.description,
            "quantity": li.quantity,
            "unit_price": fmt(li.unit_price),
            "total_price": fmt(li.total_price),
        })

    pdf_bytes = render_pdf(
        "invoice_pdf.html",
        invoice_number=invoice.invoice_number,
        created_at=invoice.created_at.strftime("%Y-%m-%d %H:%M"),
        client_email=invoice.client_email,
        subtotal=fmt(invoice.subtotal),
        vat_rate=fmt(invoice.vat_rate),
        vat_amount=fmt(invoice.vat_amount),
        grand_total=fmt(invoice.grand_total),
        line_items=items,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={invoice.invoice_number}.pdf"},
    )
