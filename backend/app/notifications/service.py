import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications.models import Notification


async def create_notification(
    db: AsyncSession,
    title: str,
    message: str,
    user_id: uuid.UUID | None = None,
    role_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        role_id=role_id,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    await db.flush()
    return notif


async def list_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    unread: bool = False,
) -> list[Notification]:
    query = select(Notification).where(
        or_(
            Notification.user_id == user_id,
            Notification.role_id == role_id,
        )
    ).order_by(Notification.created_at.desc())
    if unread:
        query = query.where(Notification.is_read == False)
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_read(db: AsyncSession, notification_id: uuid.UUID) -> Notification | None:
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
        await db.refresh(notif)
    return notif
