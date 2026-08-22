from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.observability.autonomy import can_auto_execute_l3, record_autonomy_action
from buzzard_ai_complete.ai_core.services.stock_service import StockService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class StockEngineWorker(BuzzardWorker):
    worker_id = "stock-engine"
    supported_task_types = frozenset({"stock_sync"})
    family = "stock"
    permissions = frozenset({"stock:read", "stock:sync", "memory:write"})
    capabilities = frozenset({"level_check", "freshness_check"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        sku = str(payload.get("sku", "unknown"))

        session = context.session
        if session and sku != "unknown":
            svc = StockService(session)
            result = svc.sync_stock(sku, safety_stock=int(payload.get("safety_stock", 0)))
            success = result.get("status") == "ok"
            autonomy = record_autonomy_action(
                operation="stock_sync",
                autonomy_level="L3",
                worker_id=self.worker_id,
                auto_executed=can_auto_execute_l3("stock_sync") and success,
            )
            return WorkerResult(
                success=success,
                output={**result, "autonomy": autonomy},
                metadata={**self._meta(started), "autonomy_level": "L3"},
                error=None if success else result.get("status"),
                retryable=result.get("status") == NO_DATA_AVAILABLE,
                risk_level=self.risk_default.value,
                memory_entries=[
                    domain_memory_entry(
                        f"stock/{sku}",
                        f"sync/{context.task_id}",
                        result,
                        impact=self.risk_default.value,
                    )
                ],
            )

        output = {
            "status": NO_DATA_AVAILABLE,
            "sku": sku or None,
            "message": "stock sync requires sku and configured sources",
        }
        return WorkerResult(
            success=False,
            output=output,
            metadata=self._meta(started),
            error=NO_DATA_AVAILABLE,
            retryable=False,
            risk_level=self.risk_default.value,
            memory_entries=[
                domain_memory_entry(
                    f"stock/{sku}",
                    f"sync/{context.task_id}",
                    output,
                    impact=self.risk_default.value,
                )
            ],
        )

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "reconciler",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
