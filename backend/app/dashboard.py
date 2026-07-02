import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.config import get_settings


router = APIRouter(tags=["dashboard"])

_DASHBOARD_PATH = Path(__file__).parent / "static" / "dashboard.html"


@router.get("/dashboard", include_in_schema=False, response_class=HTMLResponse)
async def dashboard() -> HTMLResponse:
    settings = get_settings()
    if settings.environment == "production":
        raise HTTPException(status_code=404, detail="Not found")

    config = {
        "adminPhone": settings.admin_phone,
        "adminPassword": settings.admin_password,
        "apiBase": "/api/v1",
    }
    html = _DASHBOARD_PATH.read_text(encoding="utf-8")
    html = html.replace("__DASHBOARD_CONFIG__", json.dumps(config))
    return HTMLResponse(html)
