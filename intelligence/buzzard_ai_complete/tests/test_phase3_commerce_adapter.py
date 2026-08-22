"""Phase 3 Wave 1 tests."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.integrations.commerce_adapter import CommerceIntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.connectors.buzzard_commerce import BuzzardCommerceConnector
from buzzard_ai_complete.ai_core.integrations.factory import get_integration_registry, reset_integration_registry_for_tests
from buzzard_ai_complete.ai_core.security.api_permissions import role_has_permission
from buzzard_ai_complete.ai_core.security.jwt_auth import encode_jwt
from buzzard_ai_complete.ai_core.services.event_service import EventService
from buzzard_ai_complete.ai_core.services.idempotency_service import IdempotencyService
from buzzard_ai_complete.api.app import app

AUTH = {"Authorization": "Bearer test-token-phase1"}


@pytest.fixture(autouse=True)
def enable_v3(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    monkeypatch.setenv("BUZZARD_API_PERMISSIONS_ENABLED", "0")
    monkeypatch.setenv("BUZZARD_JWT_ENABLED", "0")
    settings.BUZZARD_AI_CORE_V3 = True
    settings.BUZZARD_API_PERMISSIONS_ENABLED = False
    settings.BUZZARD_JWT_ENABLED = False
    reset_integration_registry_for_tests()
    yield
    reset_integration_registry_for_tests()


@pytest.fixture
def api_client():
    return TestClient(app)


def test_commerce_adapter_not_configured_honest_status():
    adapter = CommerceIntegrationAdapter(BuzzardCommerceConnector())
    assert adapter.status() == "EXTERNAL_INTEGRATION_PENDING"
    health = adapter.health_check()
    assert health["status"] == "EXTERNAL_INTEGRATION_PENDING"


def test_commerce_adapter_connected_when_health_ok(monkeypatch):
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_URL", "https://commerce.example")
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_TOKEN", "token")
    connector = BuzzardCommerceConnector()
    monkeypatch.setattr(
        connector,
        "health_check",
        lambda: {"status": "CONNECTED", "integration": "commerce"},
    )
    adapter = CommerceIntegrationAdapter(connector)
    assert adapter.status() == "CONNECTED"


def test_integration_registry_registers_commerce():
    registry = get_integration_registry()
    statuses = {item["integration_id"]: item["status"] for item in registry.list_status()}
    assert "commerce" in statuses
    assert "llm_provider" in statuses


def test_idempotency_service_deduplicates(session):
    svc = IdempotencyService(session)
    first = svc.execute_once("key-1", resource_type="test", handler=lambda: {"value": 1})
    second = svc.execute_once("key-1", resource_type="test", handler=lambda: {"value": 2})
    assert first == second == {"value": 1}


def test_event_service_emit_and_dead_letter(session):
    svc = EventService(session)
    record = svc.emit("commerce.order.created", {"order_id": "1"}, source="test", correlation_id="corr-1")
    assert record.status == EventService.STATUS_PENDING
    svc.process_pending(lambda event: (_ for _ in ()).throw(RuntimeError("fail")))
    refreshed = svc.get(record.id)
    assert refreshed is not None
    assert refreshed.retry_count >= 1


def test_jwt_auth_hs256_roundtrip(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_JWT_HS_SECRET", "test-secret")
    monkeypatch.setenv("BUZZARD_JWT_ALGORITHM", "HS256")
    settings.BUZZARD_JWT_HS_SECRET = "test-secret"
    settings.BUZZARD_JWT_ALGORITHM = "HS256"
    token = encode_jwt(subject="user@buzzard.de", roles=["admin"])
    from buzzard_ai_complete.ai_core.security.jwt_auth import decode_jwt

    claims = decode_jwt(token)
    assert claims["sub"] == "user@buzzard.de"
    assert "admin" in claims["roles"]


def test_api_permission_matrix_operator():
    assert role_has_permission("operator", "tasks:create")
    assert role_has_permission("operator", "integrations:read")
    assert not role_has_permission("analyst", "commerce:write")


def test_commerce_webhook_emits_event(api_client, monkeypatch):
    monkeypatch.setenv("COMMERCE_WEBHOOK_SECRET", "")
    monkeypatch.setenv("BUZZARD_ALLOW_UNSIGNED_WEBHOOKS", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_ALLOW_UNSIGNED_WEBHOOKS = True
    payload = {"event_type": "commerce.order.created", "order_id": "ORD-1"}
    response = api_client.post("/api/v1/integrations/webhooks/commerce", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["event_id"]


def test_events_admin_list_requires_auth(api_client):
    response = api_client.get("/api/v1/events")
    assert response.status_code in {401, 503}


def test_events_admin_list_with_auth(api_client):
    response = api_client.get("/api/v1/events", headers=AUTH)
    assert response.status_code == 200
    assert "items" in response.json()


def test_bridge_returns_real_data_when_configured(monkeypatch):
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_URL", "https://commerce.example")
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_TOKEN", "token")
    bridge = CommerceBridge()
    monkeypatch.setattr(
        bridge,
        "_request",
        lambda method, path, payload=None: {"status": "ok", "integration": "commerce", "sku": "SKU-1"},
    )
    result = bridge.read_products(sku="SKU-1")
    assert result["status"] == "ok"
    assert result["sku"] == "SKU-1"


def test_bridge_honest_no_data_when_unconfigured():
    bridge = CommerceBridge(BuzzardCommerceConnector())
    result = bridge.read_stock(sku="X")
    assert result["status"] == NO_DATA_AVAILABLE
