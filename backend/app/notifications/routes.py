import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.deps import get_current_user
from app.db import get_db
from app.notifications import schemas, service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[schemas.NotificationResponse])
async def list_notifications(
    unread: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_notifications(db, current_user.id, current_user.role_id, unread)


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notif = await service.mark_read(db, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif
