import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.audit import create_audit_log
from app.core.pagination import PaginatedResponse
from app.core.rbac import RequirePermission
from app.db import get_db
from app.hr import schemas, service

router = APIRouter(prefix="/hr/employees", tags=["hr"])


@router.post("/", response_model=schemas.EmployeeResponse, status_code=201)
async def create_employee(
    body: schemas.EmployeeCreate,
    current_user: User = Depends(RequirePermission("hr", "create")),
    db: AsyncSession = Depends(get_db),
):
    emp = await service.create_employee(db, body.name, body.job_title, body.phone)
    await create_audit_log(db, current_user.id, "employee.create", "employee", emp.id)
    await db.commit()
    return emp


@router.get("/", response_model=PaginatedResponse[schemas.EmployeeResponse])
async def list_employees(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    active_only: bool = False,
    _user=Depends(RequirePermission("hr", "read")),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_employees(db, page, page_size, search, active_only)


@router.get("/{employee_id}", response_model=schemas.EmployeeResponse)
async def get_employee(
    employee_id: uuid.UUID,
    _user=Depends(RequirePermission("hr", "read")),
    db: AsyncSession = Depends(get_db),
):
    emp = await service.get_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.patch("/{employee_id}", response_model=schemas.EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    body: schemas.EmployeeUpdate,
    current_user: User = Depends(RequirePermission("hr", "update")),
    db: AsyncSession = Depends(get_db),
):
    emp = await service.get_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    updated = await service.update_employee(db, emp, **body.model_dump(exclude_unset=True))
    await create_audit_log(db, current_user.id, "employee.update", "employee", emp.id)
    await db.commit()
    return updated
