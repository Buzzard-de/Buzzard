from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.exception.coordinator import ExceptionCoordinator
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class ExceptionCoordinatorWorker(BuzzardWorker):
    worker_id = "exception-coordinator"
    supported_task_types = frozenset({"exception_route", "exception_coordinate"})
    family = "exception"
    permissions = frozenset({"exception:read", "exception:assign"})
    capabilities = frozenset({"routing", "assignment"})
    risk_default = RiskLevel.HIGH

    def __init__(self, coordinator: ExceptionCoordinator | None = None) -> None:
        self._coordinator = coordinator
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        exception_id = str(payload.get("exception_id", ""))
        if not exception_id:
            return WorkerResult(
                success=False,
                output={"status": "NO_DATA_AVAILABLE", "message": "exception_id required"},
                metadata=self._meta(started),
                error="exception_id required",
                retryable=False,
                risk_level=self.risk_default.value,
            )
        if self._coordinator is None:
            return WorkerResult(
                success=False,
                output={
                    "status": "NO_DATA_AVAILABLE",
                    "exception_id": exception_id,
                    "message": "exception coordinator service not wired in worker context",
                },
                metadata=self._meta(started),
                error="coordinator not available",
                retryable=False,
            )
        assignment = self._coordinator.route_exception(exception_id, actor=self.worker_id)
        return WorkerResult(
            success=True,
            output=assignment,
            metadata=self._meta(started),
            risk_level=self.risk_default.value,
        )

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
