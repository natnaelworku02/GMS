import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import paginate_query
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


async def list_tools(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None):
    query = select(Tool).order_by(Tool.name)
    if search:
        query = query.where(or_(Tool.name.ilike(f"%{search}%"), Tool.specifications.ilike(f"%{search}%")))
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    tool_dicts = []
    for tool in items:
        checked_out = await get_checked_out_quantity(db, tool.id)
        tool_dicts.append({
            "id": str(tool.id),
            "name": tool.name,
            "specifications": tool.specifications,
            "total_quantity": tool.total_quantity,
            "available_quantity": tool.total_quantity - checked_out,
            "created_at": tool.created_at.isoformat() if tool.created_at else None,
        })
    return {"items": tool_dicts, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def delete_tool(db: AsyncSession, tool_id: uuid.UUID):
    checked_out = await get_checked_out_quantity(db, tool_id)
    if checked_out > 0:
        raise HTTPException(status_code=409, detail="Cannot delete tool: it has unreturned checkouts")
    tool = await get_tool(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    await db.delete(tool)
    await db.commit()


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


async def list_checkouts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    job_card_id: uuid.UUID | None = None,
    unreturned_only: bool = False,
    employee_id: uuid.UUID | None = None,
    tool_id: uuid.UUID | None = None,
):
    query = select(ToolCheckout).order_by(ToolCheckout.checked_out_at.desc())
    if search:
        query = query.where(ToolCheckout.tool_id.cast(str).ilike(f"%{search}%"))
    if job_card_id:
        query = query.where(ToolCheckout.job_card_id == job_card_id)
    if unreturned_only:
        query = query.where(ToolCheckout.checked_in_at.is_(None))
    if employee_id:
        query = query.where(ToolCheckout.employee_id == employee_id)
    if tool_id:
        query = query.where(ToolCheckout.tool_id == tool_id)
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}
