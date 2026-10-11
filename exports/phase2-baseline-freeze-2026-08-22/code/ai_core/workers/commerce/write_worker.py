from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import APPROVAL_REQUIRED, CommerceBridge
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class CommerceWriteWorker(BuzzardWorker):
    """Executes approved commerce write actions via CommerceBridge."""

    worker_id = "commerce-write"
    supported_task_types = frozenset({"commerce_write"})
    family = "commerce"
    permissions = frozenset({"commerce:write", "audit:read"})
    capabilities = frozenset({"approved_write", "action_dispatch"})
    risk_default = RiskLevel.HIGH

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        action = str(payload.get("action", ""))
        write_payload = dict(payload.get("write_payload") or payload.get("payload") or {})
        approval_granted = bool(payload.get("approval_granted"))

        if not action:
            return WorkerResult(
                success=False,
                output={"status": "VALIDATION_ERROR", "message": "action is required"},
                metadata=self._meta(started, context),
                error="missing action",
                retryable=False,
                risk_level=self.risk_default.value,
            )

        result = self._bridge.write(action, write_payload, approval_granted=approval_granted)
        status = str(result.get("status", ""))
        success = status == "ok"
        memory_entries = [
            domain_memory_entry(
                "commerce/writes",
                f"{context.task_id}/{action}",
                result,
                impact=self.risk_default.value,
            )
        ]
        return WorkerResult(
            success=success,
            output=result,
            metadata=self._meta(started, context),
            error=None if success else status,
            retryable=status not in {APPROVAL_REQUIRED},
            risk_level=self.risk_default.value,
            memory_entries=memory_entries,
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
