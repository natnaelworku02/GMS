import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_served_in_development(client: AsyncClient):
    response = await client.get("/dashboard")

    assert response.status_code == 200
    assert "GMS API Dashboard" in response.text
    assert "/api/v1" in response.text
