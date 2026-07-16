from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_connections, engine, redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_connections()


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"detail": "Resource already exists or violates a uniqueness constraint."},
    )


# --- Mount all routers ---
from app.auth.routes import (
    router as auth_router,
    roles_router,
    settings_router,
)  # noqa: E402
from app.audit.routes import router as audit_router  # noqa: E402
from app.hr.routes import router as hr_router  # noqa: E402
from app.job_cards.routes import (
    owners_router,
    vehicles_router,
    job_cards_router,
)  # noqa: E402
from app.inventory.routes import (
    locations_router,
    items_router,
    stock_router,
)  # noqa: E402
from app.performa.routes import router as performa_router  # noqa: E402
from app.tools.routes import router as tools_router  # noqa: E402
from app.notifications.routes import router as notifications_router  # noqa: E402
from app.invoice.routes import router as invoice_router  # noqa: E402
from app.dashboard import router as dashboard_router  # noqa: E402

app.include_router(auth_router, prefix="/api/v1")
app.include_router(roles_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(hr_router, prefix="/api/v1")
app.include_router(owners_router, prefix="/api/v1")
app.include_router(vehicles_router, prefix="/api/v1")
app.include_router(job_cards_router, prefix="/api/v1")
app.include_router(locations_router, prefix="/api/v1")
app.include_router(items_router, prefix="/api/v1")
app.include_router(stock_router, prefix="/api/v1")
app.include_router(performa_router, prefix="/api/v1")
app.include_router(invoice_router, prefix="/api/v1")
app.include_router(tools_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(dashboard_router)


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
