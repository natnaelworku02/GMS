import uuid

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import paginate_query
from app.hr.models import Employee


async def create_employee(db: AsyncSession, name: str, job_title: str, phone: str) -> Employee:
    employee = Employee(name=name, job_title=job_title, phone=phone)
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return employee


async def get_employee(db: AsyncSession, employee_id: uuid.UUID) -> Employee | None:
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    return result.scalar_one_or_none()


async def list_employees(db: AsyncSession, page: int = 1, page_size: int = 20, search: str | None = None, active_only: bool = False):
    query = select(Employee).order_by(Employee.name)
    if search:
        query = query.where(
            or_(Employee.name.ilike(f"%{search}%"), Employee.phone.ilike(f"%{search}%"), Employee.job_title.ilike(f"%{search}%"))
        )
    if active_only:
        query = query.where(Employee.is_active == True)
    items, total, page, page_size, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


async def delete_employee(db: AsyncSession, employee_id: uuid.UUID):
    from app.job_cards.models import JobCard, job_card_mechanics
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(JobCard).join(job_card_mechanics).where(job_card_mechanics.c.employee_id == employee_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete employee: assigned to job cards as mechanic")
    from app.tools.models import ToolCheckout
    result = await db.execute(select(ToolCheckout).where(ToolCheckout.employee_id == employee_id).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Cannot delete employee: has tool checkouts")
    employee = await get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    await db.delete(employee)
    await db.commit()


async def update_employee(db: AsyncSession, employee: Employee, **kwargs) -> Employee:
    for key, value in kwargs.items():
        if value is not None:
            setattr(employee, key, value)
    await db.commit()
    await db.refresh(employee)
    return employee
