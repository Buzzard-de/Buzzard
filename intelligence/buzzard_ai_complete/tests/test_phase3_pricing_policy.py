"""Phase 3 Wave 3 pricing policy tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.pricing.policy import PriceCandidate, PricingPolicyEngine


def test_pricing_policy_auto_approve_within_margin():
    engine = PricingPolicyEngine(min_margin=0.15, max_discount=0.25)
    candidate = PriceCandidate(sku="SKU-1", supplier_cost=70.0, recommended_price=100.0)
    result = engine.evaluate(candidate)
    assert result.allowed is True
    assert result.status == "APPROVED"
    assert result.approval_required is False


def test_pricing_policy_requires_approval_below_margin():
    engine = PricingPolicyEngine(min_margin=0.20)
    candidate = PriceCandidate(sku="SKU-2", supplier_cost=95.0, recommended_price=100.0)
    result = engine.evaluate(candidate)
    assert result.approval_required is True
    assert result.status == "REVIEW"


def test_pricing_policy_blocks_invalid_cost():
    engine = PricingPolicyEngine()
    candidate = PriceCandidate(sku="SKU-3", supplier_cost=0, recommended_price=10.0)
    result = engine.evaluate(candidate)
    assert result.allowed is False
    assert result.status == "BLOCKED"


def test_pricing_publish_gate_requires_approval(session):
    from buzzard_ai_complete.ai_core.services.pricing_service import PricingService

    svc = PricingService(session)
    result = svc.evaluate({"sku": "SKU-X", "supplier_cost": 95, "recommended_price": 100})
    session.commit()
    assert result["policy"]["approval_required"] is True
    assert result["publish"]["status"] == "APPROVAL_REQUIRED"


def test_workers_cannot_bypass_policy_engine():
    engine = PricingPolicyEngine(min_margin=0.30)
    candidate = PriceCandidate(sku="SKU-4", supplier_cost=90.0, recommended_price=100.0)
    result = engine.evaluate(candidate)
    publish = engine.publish_gate(candidate, result)
    assert publish["status"] in {"APPROVAL_REQUIRED", "BLOCKED"}
    assert publish["status"] != "READY_TO_PUBLISH"
