"""Phase 3 Wave 4 L3 autonomy tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.observability.autonomy import can_auto_execute_l3, record_autonomy_action
from buzzard_ai_complete.ai_core.observability.metrics import reset_metrics_for_tests


def test_l3_stock_sync_auto_execute_allowed():
    reset_metrics_for_tests()
    assert can_auto_execute_l3("stock_sync") is True
    record = record_autonomy_action(
        operation="stock_sync",
        autonomy_level="L3",
        worker_id="stock-engine",
        auto_executed=True,
    )
    assert record["auto_executed"] is True
    assert record["autonomy_level"] == "L3"


def test_l3_blocked_when_autonomy_disabled(monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_DISABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_DISABLED = True
    assert can_auto_execute_l3("stock_sync") is False
    record = record_autonomy_action(
        operation="stock_sync",
        autonomy_level="L3",
        worker_id="stock-engine",
        auto_executed=True,
    )
    assert record["auto_executed"] is False
    assert record["policy_result"] == "BLOCKED"


def test_phase3_registry_includes_wave4_workers(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AI_CORE_V3 = True
    from buzzard_ai_complete.ai_core.workers.registry import get_registry

    registry = get_registry()
    ids = registry.list_worker_ids()
    assert "logistics-intelligence" in ids
    assert "returns-intelligence" in ids
    assert "market-intelligence" in ids
