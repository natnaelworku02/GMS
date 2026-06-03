from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import close_connections, engine, redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_connections()


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "GMS Backend API"}


@app.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> dict[str, Any]:
    checks: dict[str, bool] = {
        "postgres": False,
        "redis": False,
    }

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        checks["postgres"] = True
    except SQLAlchemyError:
        checks["postgres"] = False

    try:
        checks["redis"] = bool(await redis_client.ping())
    except RedisError:
        checks["redis"] = False

    return {
        "status": "ok" if all(checks.values()) else "degraded",
        "checks": checks,
    }
