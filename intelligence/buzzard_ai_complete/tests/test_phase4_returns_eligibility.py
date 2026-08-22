"""Phase 3 Wave 4 returns eligibility tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.returns.eligibility import ReturnEligibilityEngine
from buzzard_ai_complete.ai_core.services.returns_service import ReturnsService


def test_return_eligibility_requires_reason():
    engine = ReturnEligibilityEngine()
    result = engine.evaluate(order_id="ORD-1", reason=None)
    assert result.eligible is False
    assert result.approval_required is True


def test_return_eligibility_approves_with_valid_payload():
    engine = ReturnEligibilityEngine()
    result = engine.evaluate(order_id="ORD-2", reason="damaged", order_total=49.99, line_items=[{"sku": "A"}])
    assert result.eligible is True
    assert result.approval_required is True


def test_returns_service_persists_evaluation(session):
    svc = ReturnsService(session)
    result = svc.evaluate({"order_id": "ORD-W4-001", "reason": "wrong item"})
    session.commit()
    assert result["status"] == "ok"
    assert result["requires_approval"] is True
    assert result["return_id"]


def test_returns_api_evaluate(session):
    from fastapi.testclient import TestClient

    from buzzard_ai_complete.api.app import app

    client = TestClient(app)
    headers = {"Authorization": "Bearer test-token-phase1"}
    response = client.post(
        "/api/v1/returns/evaluate",
        headers=headers,
        json={"order_id": "ORD-API-W4", "reason": "defective"},
    )
    assert response.status_code == 200
    assert response.json()["requires_approval"] is True
