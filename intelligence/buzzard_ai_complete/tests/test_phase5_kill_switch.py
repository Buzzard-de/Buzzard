"""Phase 3 Wave 5 kill switch tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.autonomy.action_engine import AutonomousActionEngine
from buzzard_ai_complete.ai_core.intelligence.decision.engine import DecisionEngine
from buzzard_ai_complete.ai_core.observability.autonomy import can_auto_execute_l3, is_autonomy_disabled


def test_kill_switch_blocks_l3(monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_DISABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_DISABLED = True
    assert is_autonomy_disabled() is True
    assert can_auto_execute_l3("stock_sync") is False


def test_kill_switch_blocks_l4_autonomy(monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_DISABLED", "1")
    monkeypatch.setenv("BUZZARD_AUTONOMY_L4_ENABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_DISABLED = True
    settings.BUZZARD_AUTONOMY_L4_ENABLED = True
    engine = DecisionEngine()
    decision = engine.evaluate({"action": "supplier_po", "po_total": 50, "confidence": 0.95})
    plan = AutonomousActionEngine().evaluate(decision)
    assert plan.blocked is True
    assert plan.auto_execute is False
    assert plan.block_reason == "BUZZARD_AUTONOMY_DISABLED"


def test_kill_switch_blocks_procurement_draft(session, monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_DISABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_DISABLED = True
    from buzzard_ai_complete.ai_core.services.procurement_service import ProcurementService

    svc = ProcurementService(session)
    result = svc.draft_purchase_order(
        {
            "order_id": "PO-KILL-1",
            "line_items": [{"sku": "SKU-1", "quantity": 1}],
            "candidates": [
                {"supplier_code": "SUP-A", "price": 10, "stock_available": 5, "priority": 1, "lead_time_days": 3}
            ],
        }
    )
    assert result["status"] == "BLOCKED"
