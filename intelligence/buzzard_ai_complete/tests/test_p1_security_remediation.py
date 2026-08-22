"""P1 remediation security regression tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.bridge.commerce import APPROVAL_REQUIRED, WRITES_DISABLED, CommerceBridge
from buzzard_ai_complete.api.app import app

AUTH_OPERATOR = {"Authorization": "Bearer test-token-phase1"}


def test_commerce_writes_disabled_blocks_write_even_with_approval(monkeypatch):
    monkeypatch.setenv("BUZZARD_COMMERCE_WRITES_DISABLED", "1")
    monkeypatch.setattr("buzzard_ai_complete.config.settings.BUZZARD_COMMERCE_WRITES_DISABLED", True)
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_URL", "https://commerce.example")
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_TOKEN", "token")
    bridge = CommerceBridge()
    result = bridge.write("price_update", {"sku": "X", "price": 9.99}, approval_granted=True)
    assert result["status"] == WRITES_DISABLED
    assert "BUZZARD_COMMERCE_WRITES_DISABLED" in result["message"]


def test_commerce_writes_enabled_when_flag_off(monkeypatch):
    monkeypatch.setenv("BUZZARD_COMMERCE_WRITES_DISABLED", "0")
    monkeypatch.setattr("buzzard_ai_complete.config.settings.BUZZARD_COMMERCE_WRITES_DISABLED", False)
    bridge = CommerceBridge()
    denied = bridge.write("price_update", {"sku": "X", "price": 9.99}, approval_granted=False)
    assert denied["status"] == APPROVAL_REQUIRED


def test_commerce_webhook_rejects_unsigned_when_secret_unset(monkeypatch):
    monkeypatch.setenv("COMMERCE_WEBHOOK_SECRET", "")
    monkeypatch.setenv("BUZZARD_ALLOW_UNSIGNED_WEBHOOKS", "0")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_ALLOW_UNSIGNED_WEBHOOKS = False
    client = TestClient(app)
    response = client.post(
        "/api/v1/integrations/webhooks/commerce",
        json={"event_type": "commerce.order.created", "order_id": "ORD-1"},
    )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "WEBHOOK_NOT_CONFIGURED"


def test_carrier_webhook_rejects_unsigned_when_secret_unset(monkeypatch):
    monkeypatch.setenv("CARRIER_WEBHOOK_SECRET", "")
    monkeypatch.setenv("BUZZARD_ALLOW_UNSIGNED_WEBHOOKS", "0")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_ALLOW_UNSIGNED_WEBHOOKS = False
    client = TestClient(app)
    response = client.post(
        "/api/v1/integrations/webhooks/carrier/dhl",
        json={"event_type": "carrier.tracking.updated", "tracking_id": "TRK-1"},
    )
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "WEBHOOK_NOT_CONFIGURED"


def test_analyst_denied_tasks_list_when_permissions_enabled(monkeypatch):
    monkeypatch.setenv("BUZZARD_API_PERMISSIONS_ENABLED", "1")
    monkeypatch.setenv("BUZZARD_API_TOKEN_ROLES", "analyst-token:analyst")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_API_PERMISSIONS_ENABLED = True
    settings.API_TOKEN_ROLES = {"analyst-token": "analyst"}
    client = TestClient(app)
    response = client.get("/api/v1/tasks", headers={"Authorization": "Bearer analyst-token"})
    assert response.status_code == 403


def test_exception_triage_supported_by_coordinator_worker():
    from buzzard_ai_complete.ai_core.workers.exception.coordinator_worker import ExceptionCoordinatorWorker

    worker = ExceptionCoordinatorWorker()
    assert "exception_triage" in worker.supported_task_types
