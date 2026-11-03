from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.audit import create_audit_log
from app.core.rbac import RequirePermission
from app.db import get_db
from app.backup import service
from app.config import get_settings

router = APIRouter(prefix="/backups", tags=["backups"])


class RestoreRequest(BaseModel):
    filename: str
    confirmation: str


@router.get("/")
async def backup_status(_user: User = Depends(RequirePermission("backups", "read"))):
    backups = service.list_backups()
    latest = backups[0] if backups else None
    healthy = bool(latest and (datetime.now(timezone.utc) - latest["created_at"]).total_seconds() < get_settings().backup_interval_hours * 60 * 60 * 2)
    return {"healthy": healthy, "backup_dir": get_settings().backup_dir,
            "retention_days": get_settings().backup_retention_days, "latest": latest, "backups": backups}


@router.post("/", status_code=201)
async def manual_backup(
    current_user: User = Depends(RequirePermission("backups", "create")),
    db: AsyncSession = Depends(get_db),
):
    try:
        backup = await service.create_backup()
        await create_audit_log(
            db,
            current_user.id,
            "backup.create",
            "backup",
            current_user.id,
            {"filename": backup["filename"], "size_bytes": backup["size_bytes"]},
        )
        await db.commit()
        return backup
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/restore")
async def restore_backup(
    body: RestoreRequest,
    current_user: User = Depends(RequirePermission("backups", "update")),
    db: AsyncSession = Depends(get_db),
):
    if body.confirmation != "RESTORE DATABASE":
        raise HTTPException(status_code=422, detail="Type RESTORE DATABASE to confirm")
    requested_by = current_user.id
    try:
        await db.commit()
        await service.restore_backup(body.filename)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    audit_user_id = await db.scalar(select(User.id).where(User.id == requested_by))
    if audit_user_id is None:
        audit_user_id = await db.scalar(
            select(User.id)
            .join(Role, User.role_id == Role.id)
            .where(User.is_active.is_(True), Role.is_superadmin.is_(True))
            .limit(1)
        )
    if audit_user_id is None:
        raise HTTPException(status_code=500, detail="Restore completed, but no active administrator exists")
    await create_audit_log(
        db,
        audit_user_id,
        "backup.restore",
        "backup",
        audit_user_id,
        {"filename": body.filename, "requested_by": str(requested_by)},
    )
    await db.commit()
    return {"status": "restored", "filename": body.filename}
