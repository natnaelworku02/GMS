from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db import get_db
from app.auth.models import User
from app.auth.service import check_permission


class RequirePermission:
    def __init__(self, module: str, action: str):
        self.module = module
        self.action = action

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        has_perm = await check_permission(db, current_user.role_id, self.module, self.action)
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.module}.{self.action}",
            )
        return current_user
