from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, EXTERNAL_INTEGRATION_PENDING
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class SupplierHubWorker(BuzzardWorker):
    worker_id = "supplier-hub"
    supported_task_types = frozenset({"supplier_sync"})
    family = "supplier"
    permissions = frozenset({"supplier:read", "memory:write"})
    capabilities = frozenset({"feed_ingest", "supplier_risk_scan"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._integrations = IntegrationStatusRegistry()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        status = self._integrations.status("supplier_feeds")
        if status != "CONNECTED":
            return WorkerResult(
                success=False,
                output={
                    "status": EXTERNAL_INTEGRATION_PENDING,
                    "integration": "supplier_feeds",
                    "supplier_id": payload.get("supplier_id"),
                },
                metadata=self._meta(started),
                error=EXTERNAL_INTEGRATION_PENDING,
                retryable=False,
                risk_level=self.risk_default.value,
            )
        return WorkerResult(success=True, output={"status": "ok"}, metadata=self._meta(started))

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
