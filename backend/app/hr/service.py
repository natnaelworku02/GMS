import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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


async def list_employees(db: AsyncSession, active_only: bool = False) -> list[Employee]:
    query = select(Employee).order_by(Employee.name)
    if active_only:
        query = query.where(Employee.is_active == True)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_employee(db: AsyncSession, employee: Employee, **kwargs) -> Employee:
    for key, value in kwargs.items():
        if value is not None:
            setattr(employee, key, value)
    await db.commit()
    await db.refresh(employee)
    return employee
