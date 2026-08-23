"""Phase 3 Wave 5 autonomous L4 tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.autonomy.action_engine import AutonomousActionEngine
from buzzard_ai_complete.ai_core.intelligence.decision.engine import DecisionEngine, DecisionResult
from buzzard_ai_complete.ai_core.intelligence.decision.types import DecisionOutputType


def test_l4_blocked_when_feature_flag_disabled(monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_L4_ENABLED", "0")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_L4_ENABLED = False
    engine = DecisionEngine()
    decision = engine.evaluate({"action": "supplier_po", "po_total": 100, "confidence": 0.9})
    plan = AutonomousActionEngine().evaluate(decision)
    assert plan.auto_execute is False
    assert plan.requires_approval is True


def test_l4_auto_execute_when_enabled_and_within_threshold(monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_L4_ENABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_L4_ENABLED = True
    settings.BUZZARD_AUTONOMY_DISABLED = False
    decision = DecisionResult(
        output_type=DecisionOutputType.TASK.value,
        confidence=0.9,
        content={"action": "supplier_po", "task_type": "purchase_order_draft", "po_total": 100},
        autonomy_level="L4",
    )
    plan = AutonomousActionEngine().evaluate(decision)
    assert plan.auto_execute is True
    assert plan.autonomy_level == "L4"


def test_l5_always_requires_approval():
    decision = DecisionResult(
        output_type=DecisionOutputType.APPROVAL_REQUEST.value,
        confidence=0.9,
        content={"action": "refund_recommend"},
        autonomy_level="L5",
        requires_approval=True,
    )
    plan = AutonomousActionEngine().evaluate(decision)
    assert plan.requires_approval is True
    assert plan.auto_execute is False
