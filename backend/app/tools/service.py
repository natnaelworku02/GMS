import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.models import Tool, ToolCheckout


async def create_tool(db: AsyncSession, name: str, specifications: str | None, total_quantity: int) -> Tool:
    tool = Tool(name=name, specifications=specifications, total_quantity=total_quantity)
    db.add(tool)
    await db.commit()
    await db.refresh(tool)
    return tool


async def get_tool(db: AsyncSession, tool_id: uuid.UUID) -> Tool | None:
    result = await db.execute(select(Tool).where(Tool.id == tool_id))
    return result.scalar_one_or_none()


async def get_checked_out_quantity(db: AsyncSession, tool_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(ToolCheckout.quantity), 0)).where(
            ToolCheckout.tool_id == tool_id,
            ToolCheckout.checked_in_at.is_(None),
        )
    )
    return result.scalar()


async def list_tools(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Tool).order_by(Tool.name))
    tools = list(result.scalars().all())
    tool_dicts = []
    for tool in tools:
        checked_out = await get_checked_out_quantity(db, tool.id)
        tool_dicts.append({
            "id": tool.id,
            "name": tool.name,
            "specifications": tool.specifications,
            "total_quantity": tool.total_quantity,
            "available_quantity": tool.total_quantity - checked_out,
            "created_at": tool.created_at,
        })
    return tool_dicts


async def update_tool(db: AsyncSession, tool: Tool, **kwargs) -> Tool:
    for key, value in kwargs.items():
        if value is not None:
            setattr(tool, key, value)
    await db.commit()
    await db.refresh(tool)
    return tool


async def checkout_tool(
    db: AsyncSession,
    tool_id: uuid.UUID,
    employee_id: uuid.UUID,
    job_card_id: uuid.UUID,
    quantity: int,
    issued_by: uuid.UUID,
) -> ToolCheckout:
    tool = await get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    checked_out = await get_checked_out_quantity(db, tool_id)
    available = tool.total_quantity - checked_out
    if quantity > available:
        raise HTTPException(status_code=422, detail=f"Insufficient tools. Available: {available}")

    checkout = ToolCheckout(
        tool_id=tool_id,
        employee_id=employee_id,
        job_card_id=job_card_id,
        quantity=quantity,
        issued_by=issued_by,
    )
    db.add(checkout)
    await db.commit()
    await db.refresh(checkout)
    return checkout


async def return_tool(db: AsyncSession, checkout_id: uuid.UUID) -> ToolCheckout:
    result = await db.execute(select(ToolCheckout).where(ToolCheckout.id == checkout_id))
    checkout = result.scalar_one_or_none()
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found")
    if checkout.checked_in_at:
        raise HTTPException(status_code=422, detail="Already returned")
    checkout.checked_in_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(checkout)
    return checkout


async def list_checkouts(db: AsyncSession, job_card_id: uuid.UUID | None = None, unreturned_only: bool = False) -> list[ToolCheckout]:
    query = select(ToolCheckout).order_by(ToolCheckout.checked_out_at.desc())
    if job_card_id:
        query = query.where(ToolCheckout.job_card_id == job_card_id)
    if unreturned_only:
        query = query.where(ToolCheckout.checked_in_at.is_(None))
    result = await db.execute(query)
    return list(result.scalars().all())
