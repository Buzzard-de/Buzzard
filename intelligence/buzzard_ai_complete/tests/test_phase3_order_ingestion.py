"""Phase 3 Wave 3 order ingestion and idempotency tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.orders.ingestion import OrderIngestionService
from buzzard_ai_complete.ai_core.services.order_service import OrderService


def test_order_ingest_idempotent(session):
    svc = OrderService(session)
    payload = {
        "order_id": "ORD-W3-001",
        "source": "staging",
        "customer_ref": "cust-1",
        "line_items": [{"sku": "SKU-W2-001", "quantity": 2}],
    }
    first = svc.ingest(payload, idempotency_key="idem-ord-1")
    session.commit()
    second = svc.ingest(payload, idempotency_key="idem-ord-1")
    session.commit()
    assert first["status"] == "ok"
    assert second["status"] == "ok"
    assert second.get("duplicate") is True


def test_order_ingest_validation_errors(session):
    svc = OrderIngestionService(session)
    result = svc.ingest({})
    assert result["status"] == "VALIDATION_ERROR"


def test_order_ingest_api(session):
    from fastapi.testclient import TestClient

    from buzzard_ai_complete.api.app import app

    client = TestClient(app)
    headers = {"Authorization": "Bearer test-token-phase1"}
    response = client.post(
        "/api/v1/orders/ingest",
        headers=headers,
        json={
            "order_id": "ORD-API-001",
            "source": "api",
            "line_items": [{"sku": "SKU-W2-001", "quantity": 1}],
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
