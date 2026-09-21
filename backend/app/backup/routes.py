from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.deps import get_current_user
from app.db import get_db
from app.backup import service
from app.config import get_settings

router = APIRouter(prefix="/backups", tags=["backups"])


class RestoreRequest(BaseModel):
    filename: str
    confirmation: str


async def require_superadmin(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> User:
    role = await db.scalar(select(Role).where(Role.id == current_user.role_id))
    if not role or not role.is_superadmin:
        raise HTTPException(status_code=403, detail="Super administrator access required")
    return current_user


@router.get("/")
async def backup_status(_user: User = Depends(require_superadmin)):
    backups = service.list_backups()
    latest = backups[0] if backups else None
    healthy = bool(latest and (datetime.now(timezone.utc) - latest["created_at"]).total_seconds() < get_settings().backup_interval_hours * 60 * 60 * 2)
    return {"healthy": healthy, "backup_dir": get_settings().backup_dir,
            "retention_days": get_settings().backup_retention_days, "latest": latest, "backups": backups}


@router.post("/", status_code=201)
async def manual_backup(_user: User = Depends(require_superadmin)):
    try:
        return await service.create_backup()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/restore")
async def restore_backup(body: RestoreRequest, _user: User = Depends(require_superadmin)):
    if body.confirmation != "RESTORE DATABASE":
        raise HTTPException(status_code=422, detail="Type RESTORE DATABASE to confirm")
    try:
        await service.restore_backup(body.filename)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "restored", "filename": body.filename}
