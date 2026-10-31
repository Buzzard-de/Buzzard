from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class OrderEngineWorker(BuzzardWorker):
    worker_id = "order-engine"
    supported_task_types = frozenset({"order_check"})
    family = "order"
    permissions = frozenset({"order:read", "memory:write"})
    capabilities = frozenset({"lifecycle_check", "anomaly_detection"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        order_id = str(payload.get("order_id", "unknown"))
        orders = self._bridge.read_orders(order_id=order_id or None)
        if orders.get("status") == NO_DATA_AVAILABLE:
            return WorkerResult(
                success=False,
                output=orders,
                metadata=self._meta(started),
                error=NO_DATA_AVAILABLE,
                retryable=False,
                risk_level=self.risk_default.value,
                memory_entries=[
                    domain_memory_entry(
                        f"orders/{order_id}",
                        f"check/{context.task_id}",
                        orders,
                        impact=self.risk_default.value,
                    )
                ],
            )
        return WorkerResult(
            success=True,
            output=orders,
            metadata=self._meta(started),
            memory_entries=[
                domain_memory_entry(
                    f"orders/{order_id}",
                    f"check/{context.task_id}",
                    orders,
                )
            ],
        )

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
