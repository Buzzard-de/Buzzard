"""Phase 3 Wave 1 JWT authentication tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.api.app import app


@pytest.fixture(autouse=True)
def jwt_settings(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    monkeypatch.setenv("BUZZARD_JWT_ENABLED", "1")
    monkeypatch.setenv("BUZZARD_JWT_HS_SECRET", "phase3-test-secret")
    monkeypatch.setenv("BUZZARD_JWT_ALGORITHM", "HS256")
    monkeypatch.setenv("BUZZARD_API_PERMISSIONS_ENABLED", "0")
    settings.BUZZARD_AI_CORE_V3 = True
    settings.BUZZARD_JWT_ENABLED = True
    settings.BUZZARD_JWT_HS_SECRET = "phase3-test-secret"
    settings.BUZZARD_JWT_ALGORITHM = "HS256"
    settings.BUZZARD_API_PERMISSIONS_ENABLED = False


def test_jwt_auth_allows_valid_token():
    from buzzard_ai_complete.ai_core.security.jwt_auth import encode_jwt

    token = encode_jwt(subject="operator@buzzard.de", roles=["operator"])
    client = TestClient(app)
    response = client.get("/api/v1/agents", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_jwt_auth_rejects_invalid_token():
    client = TestClient(app)
    response = client.get("/api/v1/agents", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert response.status_code == 401


def test_bearer_fallback_when_jwt_disabled(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_JWT_ENABLED", "0")
    settings.BUZZARD_JWT_ENABLED = False
    client = TestClient(app)
    response = client.get(
        "/api/v1/agents",
        headers={"Authorization": "Bearer test-token-phase1"},
    )
    assert response.status_code == 200
