from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.intelligence.decision.types import DecisionOutputType
from buzzard_ai_complete.ai_core.services.decision_service import DecisionService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class DecisionEngineWorker(BuzzardWorker):
    worker_id = "decision-engine"
    supported_task_types = frozenset({"decision_evaluate", "decision_synthesize"})
    family = "decision"
    permissions = frozenset({"memory:read", "decisions:write", "tasks:create"})
    capabilities = frozenset({"signal_aggregation", "recommendation", "task_creation"})
    risk_default = RiskLevel.MEDIUM

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        session = context.session
        if not session:
            return WorkerResult(
                success=False,
                output={"status": "NO_SESSION"},
                metadata=self._meta(started, context),
                error="database session required",
                retryable=False,
                risk_level=self.risk_default.value,
            )

        svc = DecisionService(session)
        if task_type == "decision_synthesize":
            result = svc.synthesize(payload)
        else:
            result = svc.evaluate_with_autonomy({**payload, "task_id": context.task_id}, worker_id=self.worker_id)

        success = result.get("status") == "ok"
        output_type = result.get("output_type", "")
        risk = RiskLevel.HIGH.value if result.get("requires_approval") else self.risk_default.value

        return WorkerResult(
            success=success,
            output=result,
            metadata=self._meta(started, context),
            error=None if success else result.get("status"),
            retryable=False,
            risk_level=risk,
            memory_entries=[
                domain_memory_entry(
                    "decisions",
                    f"{task_type}/{context.task_id}",
                    result,
                    impact=risk,
                )
            ],
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "decision_engine",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
