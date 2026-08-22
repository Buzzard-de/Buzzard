from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry
from buzzard_ai_complete.config import settings


def is_autonomy_disabled() -> bool:
    return settings.BUZZARD_AUTONOMY_DISABLED


def record_autonomy_action(
    *,
    operation: str,
    autonomy_level: str,
    worker_id: str,
    auto_executed: bool,
    policy_result: str = "ALLOWED",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Record L3 auto-execute actions for audit and metrics."""
    metrics = get_metrics_registry()
    metrics.counter("buzzard_autonomy_actions_total", ("operation", "level", "worker_id")).inc(
        operation=operation,
        level=autonomy_level,
        worker_id=worker_id,
    )
    if auto_executed:
        metrics.counter("buzzard_autonomy_auto_executed_total", ("operation",)).inc(operation=operation)

    return {
        "autonomy_level": autonomy_level,
        "operation": operation,
        "worker_id": worker_id,
        "auto_executed": auto_executed and not is_autonomy_disabled(),
        "policy_result": "BLOCKED" if is_autonomy_disabled() else policy_result,
        "metadata": metadata or {},
    }


def can_auto_execute_l3(operation: str) -> bool:
    if is_autonomy_disabled():
        return False
    allowed_l3 = {
        "stock_sync",
        "supplier_sync",
        "report_generation",
        "integration_health_update",
        "market_scan",
    }
    return operation in allowed_l3
