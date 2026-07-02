import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.service import get_setting
from app.performa.models import Performa, PerformaLineItem


async def create_performa(db: AsyncSession, job_card_id: uuid.UUID, client_email: str | None, line_items: list[dict]) -> Performa:
    vat_setting = await get_setting(db, "vat_rate")
    vat_rate = Decimal(vat_setting.value) if vat_setting else Decimal("15.0")

    result = await db.execute(
        select(Performa).where(Performa.job_card_id == job_card_id).order_by(Performa.version.desc())
    )
    latest = result.scalar_one_or_none()
    version = (latest.version + 1) if latest else 1

    performa = Performa(
        job_card_id=job_card_id,
        version=version,
        client_email=client_email,
        vat_rate=vat_rate,
    )
    db.add(performa)
    await db.flush()

    subtotal = Decimal("0")
    for item_data in line_items:
        total_price = Decimal(str(item_data["unit_price"])) * item_data["quantity"]
        line_item = PerformaLineItem(
            performa_id=performa.id,
            type=item_data["type"],
            description=item_data["description"],
            inventory_item_id=item_data.get("inventory_item_id"),
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=total_price,
        )
        db.add(line_item)
        subtotal += total_price

    vat_amount = subtotal * vat_rate / Decimal("100")
    performa.subtotal = subtotal
    performa.vat_amount = vat_amount
    performa.grand_total = subtotal + vat_amount

    await db.commit()
    return await get_performa(db, performa.id)


async def get_performa(db: AsyncSession, performa_id: uuid.UUID) -> Performa | None:
    result = await db.execute(
        select(Performa).options(selectinload(Performa.line_items)).where(Performa.id == performa_id)
    )
    return result.scalar_one_or_none()


async def list_performas(db: AsyncSession, job_card_id: uuid.UUID | None = None) -> list[Performa]:
    query = select(Performa).options(selectinload(Performa.line_items)).order_by(Performa.created_at.desc())
    if job_card_id:
        query = query.where(Performa.job_card_id == job_card_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_status(db: AsyncSession, performa: Performa, status: str) -> Performa:
    performa.status = status
    await db.commit()
    return await get_performa(db, performa.id)


async def revise_performa(db: AsyncSession, performa_id: uuid.UUID, line_items: list[dict]) -> Performa | None:
    original = await get_performa(db, performa_id)
    if not original:
        return None
    return await create_performa(db, original.job_card_id, original.client_email, line_items)
