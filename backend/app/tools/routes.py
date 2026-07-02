import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.tools import schemas, service

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/", response_model=schemas.ToolResponse, status_code=201)
async def create_tool(
    body: schemas.ToolCreate,
    current_user: User = Depends(RequirePermission("tools", "create")),
    db: AsyncSession = Depends(get_db),
):
    tool = await service.create_tool(db, body.name, body.specifications, body.total_quantity)
    await create_audit_log(db, current_user.id, "tool.create", "tool", tool.id)
    await db.commit()
    checked_out = await service.get_checked_out_quantity(db, tool.id)
    return {**tool.__dict__, "available_quantity": tool.total_quantity - checked_out}


@router.get("/", response_model=list[schemas.ToolResponse])
async def list_tools(
    _user=Depends(RequirePermission("tools", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_tools(db)


@router.get("/{tool_id}", response_model=schemas.ToolResponse)
async def get_tool(
    tool_id: uuid.UUID,
    _user=Depends(RequirePermission("tools", "read")),
    db: AsyncSession = Depends(get_db),
):
    tool = await service.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    checked_out = await service.get_checked_out_quantity(db, tool.id)
    return {**tool.__dict__, "available_quantity": tool.total_quantity - checked_out}


@router.patch("/{tool_id}", response_model=schemas.ToolResponse)
async def update_tool(
    tool_id: uuid.UUID,
    body: schemas.ToolUpdate,
    current_user: User = Depends(RequirePermission("tools", "update")),
    db: AsyncSession = Depends(get_db),
):
    tool = await service.get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    updated = await service.update_tool(db, tool, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "tool.update", "tool", tool.id)
    await db.commit()
    checked_out = await service.get_checked_out_quantity(db, tool.id)
    return {**updated.__dict__, "available_quantity": updated.total_quantity - checked_out}


# --- Checkouts ---

@router.post("/checkouts", response_model=schemas.CheckoutResponse, status_code=201)
async def checkout_tool(
    body: schemas.CheckoutCreate,
    current_user: User = Depends(RequirePermission("tools", "create")),
    db: AsyncSession = Depends(get_db),
):
    checkout = await service.checkout_tool(
        db, body.tool_id, body.employee_id, body.job_card_id, body.quantity, current_user.id,
    )
    await create_audit_log(db, current_user.id, "tool.checkout", "tool", body.tool_id,
                           details={"checkout_id": str(checkout.id), "quantity": body.quantity})
    await db.commit()
    return checkout


@router.patch("/checkouts/{checkout_id}/return", response_model=schemas.CheckoutResponse)
async def return_tool(
    checkout_id: uuid.UUID,
    current_user: User = Depends(RequirePermission("tools", "update")),
    db: AsyncSession = Depends(get_db),
):
    checkout = await service.return_tool(db, checkout_id)
    await create_audit_log(db, current_user.id, "tool.return", "tool", checkout.tool_id,
                           details={"checkout_id": str(checkout_id)})
    await db.commit()
    return checkout


@router.get("/checkouts", response_model=list[schemas.CheckoutResponse])
async def list_checkouts(
    job_card_id: uuid.UUID | None = None,
    unreturned_only: bool = False,
    _user=Depends(RequirePermission("tools", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_checkouts(db, job_card_id, unreturned_only)
