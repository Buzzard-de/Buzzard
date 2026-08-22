"""Phase 3 Wave 5 decision engine tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.decision.engine import DecisionEngine
from buzzard_ai_complete.ai_core.intelligence.decision.types import DecisionOutputType


def test_decision_engine_produces_signal_for_low_confidence():
    engine = DecisionEngine()
    result = engine.evaluate({"signals": [{"type": "price"}], "confidence": 0.2})
    assert result.output_type == DecisionOutputType.SIGNAL.value


def test_decision_engine_produces_recommendation_for_medium_confidence():
    engine = DecisionEngine()
    result = engine.evaluate({"signals": [{"type": "stock"}], "confidence": 0.55})
    assert result.output_type == DecisionOutputType.RECOMMENDATION.value


def test_decision_engine_l5_approval_for_high_risk():
    engine = DecisionEngine()
    result = engine.evaluate({"action": "commerce_write", "risk_level": "HIGH", "confidence": 0.9})
    assert result.output_type == DecisionOutputType.APPROVAL_REQUEST.value
    assert result.requires_approval is True
    assert result.autonomy_level == "L5"


def test_decision_engine_l4_task_for_low_po():
    engine = DecisionEngine()
    result = engine.evaluate({"action": "supplier_po", "po_total": 100, "confidence": 0.9})
    assert result.output_type == DecisionOutputType.TASK.value
    assert result.autonomy_level == "L4"


def test_decision_engine_never_produces_execute():
    engine = DecisionEngine()
    for payload in [
        {"confidence": 0.9, "action": "create_task"},
        {"confidence": 0.2},
        {"action": "supplier_po", "po_total": 50, "confidence": 0.95},
    ]:
        result = engine.evaluate(payload)
        assert result.output_type != "EXECUTE"


def test_decision_service_persists(session):
    from buzzard_ai_complete.ai_core.services.decision_service import DecisionService

    svc = DecisionService(session)
    result = svc.evaluate({"signals": [], "confidence": 0.8, "action": "evaluate"})
    session.commit()
    assert result["decision_id"]
    assert result["output_type"] in {t.value for t in DecisionOutputType}
