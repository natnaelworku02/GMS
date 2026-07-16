from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


async def paginate_query(
    db: AsyncSession,
    stmt,
    page: int = 1,
    page_size: int = 20,
):
    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    total_pages = ceil(total / page_size) if total > 0 else 0

    return items, total, page, page_size, total_pages
