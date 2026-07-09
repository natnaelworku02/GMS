import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pdf import render_pdf

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.db import get_db
from app.performa import schemas, service

router = APIRouter(prefix="/performas", tags=["performa"])


@router.post("/", response_model=schemas.PerformaResponse, status_code=201)
async def create_performa(
    body: schemas.PerformaCreate,
    current_user: User = Depends(RequirePermission("performa", "create")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.create_performa(
        db,
        body.job_card_id,
        body.client_email,
        [item.model_dump() for item in body.line_items],
    )
    await create_audit_log(db, current_user.id, "performa.create", "performa", performa.id)
    await db.commit()
    return performa


@router.get("/", response_model=PaginatedResponse[schemas.PerformaResponse])
async def list_performas(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    job_card_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_performas(db, page, page_size, search, job_card_id, status)


@router.get("/{performa_id}", response_model=schemas.PerformaResponse)
async def get_performa(
    performa_id: uuid.UUID,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")
    return performa


@router.patch("/{performa_id}/status", response_model=schemas.PerformaResponse)
async def update_status(
    performa_id: uuid.UUID,
    body: schemas.PerformaStatusUpdate,
    current_user: User = Depends(RequirePermission("performa", "update")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Status must be 'approved' or 'rejected'")
    updated = await service.update_status(db, performa, body.status)
    await create_audit_log(db, current_user.id, "performa.status_change", "performa", performa_id,
                           details={"new_status": body.status})
    await db.commit()
    return updated


@router.post("/{performa_id}/send", response_model=schemas.PerformaResponse)
async def send_performa(
    performa_id: uuid.UUID,
    body: schemas.PerformaSendRequest,
    current_user: User = Depends(RequirePermission("performa", "update")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")

    performa.client_email = body.client_email
    performa.status = "sent"
    performa.sent_at = datetime.now(timezone.utc)
    await db.commit()

    await create_audit_log(db, current_user.id, "performa.send", "performa", performa_id,
                           details={"email": body.client_email})
    await db.commit()
    return await service.get_performa(db, performa_id)


@router.post("/{performa_id}/revise", response_model=schemas.PerformaResponse, status_code=201)
async def revise_performa(
    performa_id: uuid.UUID,
    body: schemas.PerformaRevise,
    current_user: User = Depends(RequirePermission("performa", "create")),
    db: AsyncSession = Depends(get_db),
):
    revised = await service.revise_performa(
        db, performa_id, [item.model_dump() for item in body.line_items]
    )
    if not revised:
        raise HTTPException(status_code=404, detail="Original performa not found")
    await create_audit_log(db, current_user.id, "performa.revise", "performa", revised.id,
                           details={"original_id": str(performa_id)})
    await db.commit()
    return revised


@router.get("/{performa_id}/pdf")
async def download_performa_pdf(
    performa_id: uuid.UUID,
    _user=Depends(RequirePermission("performa", "read")),
    db: AsyncSession = Depends(get_db),
):
    performa = await service.get_performa(db, performa_id)
    if not performa:
        raise HTTPException(status_code=404, detail="Performa not found")

    fmt = lambda n: f"{Decimal(str(n)):,.2f}"

    items = []
    for li in performa.line_items:
        items.append({
            "type": li.type,
            "description": li.description,
            "quantity": li.quantity,
            "unit_price": fmt(li.unit_price),
            "total_price": fmt(li.total_price),
        })

    pdf_bytes = render_pdf(
        "performa_pdf.html",
        invoice_number=None,
        version=performa.version,
        status=performa.status,
        created_at=performa.created_at.strftime("%Y-%m-%d %H:%M"),
        client_email=performa.client_email,
        subtotal=fmt(performa.subtotal),
        vat_rate=fmt(performa.vat_rate),
        vat_amount=fmt(performa.vat_amount),
        grand_total=fmt(performa.grand_total),
        line_items=items,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=performa-{performa_id}.pdf"},
    )
