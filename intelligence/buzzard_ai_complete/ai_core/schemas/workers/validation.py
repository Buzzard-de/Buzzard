from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.workers.base import WorkerExecutionError


REQUIRED_OUTPUT_KEYS: dict[str, tuple[str, ...]] = {
    "category_scan": ("status",),
    "kurmay_synthesis": ("report_id", "situation_summary"),
    "supplier_sync": ("status",),
    "product_enrich": ("status",),
    "price_recheck": ("sku",),
    "stock_sync": ("status",),
    "order_check": ("status",),
    "customs_classify": ("status",),
    "customer_service": ("resolution",),
    "exception_route": (),
    "exception_coordinate": (),
    "market_scan": ("status",),
    "competitor_analysis": ("status",),
    "trend_detection": ("status",),
    "shipment_rate": ("status",),
    "label_create": ("status",),
    "tracking_update": ("status",),
    "return_evaluate": ("eligibility", "requires_approval"),
    "return_process": ("eligibility", "requires_approval"),
    "refund_recommend": ("eligibility", "requires_approval"),
    "system_health": (),
}


def validate_worker_output(task_type: str, output: Any) -> None:
    if output is None:
        raise WorkerExecutionError(f"worker output is None for task type {task_type!r}", retryable=False)
    if not isinstance(output, dict):
        raise WorkerExecutionError(
            f"worker output must be dict for task type {task_type!r}, got {type(output).__name__}",
            retryable=False,
        )
    required = REQUIRED_OUTPUT_KEYS.get(task_type, ())
    missing = [key for key in required if key not in output]
    if missing:
        raise WorkerExecutionError(
            f"worker output missing required keys {missing} for task type {task_type!r}",
            retryable=False,
        )
