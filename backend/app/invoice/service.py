import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.invoice.models import Invoice, InvoiceLineItem
from app.performa.models import Performa


async def generate_invoice_number(db: AsyncSession) -> str:
    count = await db.scalar(select(func.count()).select_from(Invoice))
    next_num = (count or 0) + 1
    return f"INV-{next_num:05d}"


async def create_invoice_from_performa(db: AsyncSession, performa: Performa) -> Invoice:
    invoice_number = await generate_invoice_number(db)

    invoice = Invoice(
        performa_id=performa.id,
        job_card_id=performa.job_card_id,
        invoice_number=invoice_number,
        subtotal=performa.subtotal,
        vat_rate=performa.vat_rate,
        vat_amount=performa.vat_amount,
        grand_total=performa.grand_total,
        client_email=performa.client_email,
    )
    db.add(invoice)
    await db.flush()

    for item in performa.line_items:
        line = InvoiceLineItem(
            invoice_id=invoice.id,
            type=item.type,
            description=item.description,
            inventory_item_id=item.inventory_item_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
        )
        db.add(line)

    await db.commit()
    return await get_invoice(db, invoice.id)


async def get_invoice(db: AsyncSession, invoice_id: uuid.UUID) -> Invoice | None:
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.line_items)).where(Invoice.id == invoice_id)
    )
    return result.scalar_one_or_none()


async def list_invoices(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
):
    from app.core.pagination import paginate_query

    query = select(Invoice).options(selectinload(Invoice.line_items)).order_by(Invoice.created_at.desc())
    if search:
        query = query.where(
            Invoice.invoice_number.ilike(f"%{search}%")
        )
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}
