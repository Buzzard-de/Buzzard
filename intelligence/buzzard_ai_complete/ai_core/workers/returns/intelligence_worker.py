from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry
from buzzard_ai_complete.ai_core.services.returns_service import ReturnsService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class ReturnsIntelligenceWorker(BuzzardWorker):
    worker_id = "returns-intelligence"
    supported_task_types = frozenset({"return_evaluate", "return_process", "refund_recommend"})
    family = "returns"
    permissions = frozenset({"returns:read", "returns:evaluate", "orders:read", "memory:write"})
    capabilities = frozenset({"eligibility_check", "routing", "refund_recommendation"})
    risk_default = RiskLevel.HIGH

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        session = context.session
        get_metrics_registry().counter("buzzard_worker_executions_total", ("worker_id", "task_type")).inc(
            worker_id=self.worker_id,
            task_type=task_type,
        )

        if not session:
            return WorkerResult(
                success=False,
                output={"status": "NO_SESSION"},
                metadata=self._meta(started, context),
                error="database session required",
                retryable=False,
                risk_level=self.risk_default.value,
            )

        svc = ReturnsService(session)
        if task_type in {"return_evaluate", "return_process", "refund_recommend"}:
            result = svc.evaluate(payload)
            success = result.get("status") == "ok"
        else:
            result = {"status": "UNSUPPORTED_TASK"}
            success = False

        order_id = str(payload.get("order_id", "unknown"))
        output = {
            **result,
            "eligibility": result.get("eligibility"),
            "recommendation": result.get("eligibility"),
            "requires_approval": True,
        }
        return WorkerResult(
            success=success,
            output=output,
            metadata=self._meta(started, context),
            error=None if success else result.get("status"),
            retryable=False,
            risk_level=RiskLevel.HIGH.value,
            memory_entries=[
                domain_memory_entry(
                    f"returns/{order_id}",
                    f"{task_type}/{context.task_id}",
                    output,
                    impact=RiskLevel.HIGH.value,
                )
            ],
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "returns_service",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
