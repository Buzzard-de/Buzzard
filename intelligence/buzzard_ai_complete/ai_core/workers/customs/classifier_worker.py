from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import EXTERNAL_INTEGRATION_PENDING
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class CustomsClassifierWorker(BuzzardWorker):
    worker_id = "customs-classifier"
    supported_task_types = frozenset({"customs_classify"})
    family = "customs"
    permissions = frozenset({"customs:read", "memory:write"})
    capabilities = frozenset({"hs_classification", "duty_estimation"})
    risk_default = RiskLevel.HIGH

    def __init__(self) -> None:
        self._integrations = IntegrationStatusRegistry()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        status = self._integrations.status("customs_authority")
        product_desc = str(payload.get("description", ""))
        if status != "CONNECTED":
            return WorkerResult(
                success=False,
                output={
                    "status": EXTERNAL_INTEGRATION_PENDING,
                    "integration": "customs_authority",
                    "description": product_desc,
                    "message": "customs authority integration pending; no classification issued",
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
