"""Phase 3 Wave 1 API permission enforcement tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.api.app import app


@pytest.fixture(autouse=True)
def permission_settings(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    monkeypatch.setenv("BUZZARD_API_PERMISSIONS_ENABLED", "1")
    monkeypatch.setenv("BUZZARD_JWT_ENABLED", "0")
    monkeypatch.setenv("BUZZARD_API_TOKEN", "admin-token")
    monkeypatch.setenv("BUZZARD_API_TOKEN_ROLES", "admin-token:admin,analyst-token:analyst")
    settings.BUZZARD_AI_CORE_V3 = True
    settings.BUZZARD_API_PERMISSIONS_ENABLED = True
    settings.BUZZARD_JWT_ENABLED = False
    settings.API_TOKEN = "admin-token"
    settings.API_TOKEN_ROLES = {"admin-token": "admin", "analyst-token": "analyst"}


def test_admin_can_list_agents():
    client = TestClient(app)
    response = client.get("/api/v1/agents", headers={"Authorization": "Bearer admin-token"})
    assert response.status_code == 200


def test_analyst_denied_commerce_write():
    client = TestClient(app)
    response = client.post(
        "/api/v1/commerce/write",
        json={"action": "price_update", "payload": {"sku": "X", "price": 1}},
        headers={"Authorization": "Bearer analyst-token"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "PERMISSION_DENIED"


def test_admin_can_read_events():
    client = TestClient(app)
    response = client.get("/api/v1/events", headers={"Authorization": "Bearer admin-token"})
    assert response.status_code == 200
