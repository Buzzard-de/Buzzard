from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class StockEngineWorker(BuzzardWorker):
    worker_id = "stock-engine"
    supported_task_types = frozenset({"stock_sync"})
    family = "stock"
    permissions = frozenset({"stock:read", "memory:write"})
    capabilities = frozenset({"level_check", "freshness_check"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        self._integrations = IntegrationStatusRegistry()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        wms_status = self._integrations.status("wms")
        sku = str(payload.get("sku", ""))
        stock = self._bridge.read_stock(sku=sku or None)
        if wms_status != "CONNECTED" or stock.get("status") == NO_DATA_AVAILABLE:
            return WorkerResult(
                success=False,
                output={
                    "status": NO_DATA_AVAILABLE,
                    "wms_integration": wms_status,
                    "sku": sku or None,
                    "bridge": stock,
                },
                metadata=self._meta(started),
                error=NO_DATA_AVAILABLE,
                retryable=False,
                risk_level=self.risk_default.value,
            )
        return WorkerResult(success=True, output=stock, metadata=self._meta(started))

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
