from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.integrations.carrier_adapter import CarrierIntegrationAdapter
from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry
from buzzard_ai_complete.ai_core.services.logistics_service import LogisticsService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class LogisticsIntelligenceWorker(BuzzardWorker):
    worker_id = "logistics-intelligence"
    supported_task_types = frozenset({"shipment_rate", "label_create", "tracking_update"})
    family = "logistics"
    permissions = frozenset({"logistics:read", "logistics:execute", "orders:read", "memory:write"})
    capabilities = frozenset({"rate_quote", "label_generation", "tracking"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._carrier = CarrierIntegrationAdapter()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        session = context.session
        metrics = get_metrics_registry()
        metrics.counter("buzzard_worker_executions_total", ("worker_id", "task_type")).inc(
            worker_id=self.worker_id,
            task_type=task_type,
        )

        if not session:
            return WorkerResult(
                success=False,
                output={"status": "NO_SESSION", "task_type": task_type},
                metadata=self._meta(started, context),
                error="database session required",
                retryable=False,
                risk_level=self.risk_default.value,
            )

        svc = LogisticsService(session, self._carrier)
        if task_type == "shipment_rate":
            result = svc.quote_rate(payload)
            success = result.get("status") == "ok"
        elif task_type == "label_create":
            result = svc.create_label(payload, idempotency_key=payload.get("idempotency_key"))
            success = result.get("status") in {"LABEL_CREATED", "APPROVAL_REQUIRED"}
        else:
            carrier_id = str(payload.get("carrier_id", "dhl")).lower()
            adapter = self._carrier.get_adapter(carrier_id)
            tracking_number = str(payload.get("tracking_number", ""))
            result = adapter.track(tracking_number) if adapter else {"status": "UNKNOWN_CARRIER"}
            success = result.get("status") not in {"EXTERNAL_INTEGRATION_PENDING", "UNKNOWN_CARRIER"}

        shipment_id = payload.get("order_id") or payload.get("tracking_number") or context.task_id
        return WorkerResult(
            success=success,
            output={**result, "carrier_id": result.get("carrier_id", payload.get("carrier_id", "dhl")), "status": result.get("status", "ok")},
            metadata=self._meta(started, context),
            error=None if success else result.get("status"),
            retryable=result.get("status") == "EXTERNAL_INTEGRATION_PENDING",
            risk_level=RiskLevel.HIGH.value if result.get("status") == "APPROVAL_REQUIRED" else self.risk_default.value,
            memory_entries=[
                domain_memory_entry(
                    f"logistics/{shipment_id}",
                    f"{task_type}/{context.task_id}",
                    result,
                    impact=RiskLevel.HIGH.value if result.get("status") == "APPROVAL_REQUIRED" else self.risk_default.value,
                )
            ],
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "logistics_service",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
