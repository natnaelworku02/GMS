from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.audit.schemas import AuditLogResponse
from app.core.pagination import PaginatedResponse, paginate_query
from app.core.rbac import RequirePermission
from app.db import get_db

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("/", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    _user=Depends(RequirePermission("settings", "read")),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if search:
        query = query.where(
            or_(AuditLog.action.ilike(f"%{search}%"), AuditLog.entity_type.ilike(f"%{search}%"))
        )
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    items, total, page_n, page_size_n, total_pages = await paginate_query(db, query, page, page_size)
    return {"items": items, "total": total, "page": page_n, "page_size": page_size_n, "total_pages": total_pages}
