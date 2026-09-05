from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.security.service import SecurityService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class SecurityAIWorker(BuzzardWorker):
    worker_id = "security-ai"
    supported_task_types = frozenset({"security_scan", "security_inspect"})
    family = "security"
    permissions = frozenset({"security:read", "security:write", "audit:read"})
    capabilities = frozenset({"policy_inspect", "text_scan", "threat_detection"})
    risk_default = RiskLevel.CRITICAL

    def __init__(self, security: SecurityService | None = None) -> None:
        self._security = security or SecurityService()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        if task_type == "security_scan":
            text = str(payload.get("text", ""))
            scan = self._security.scan_text(text)
            return WorkerResult(
                success=bool(scan.get("safe")),
                output=scan,
                metadata=self._meta(started),
                risk_level=RiskLevel.HIGH.value if not scan.get("safe") else RiskLevel.LOW.value,
            )

        inspection = self._security.inspect_task(
            context.task_id,
            task_type,
            payload.get("worker_id"),
        )
        allowed = bool(inspection.get("allowed"))
        return WorkerResult(
            success=allowed,
            output=inspection,
            metadata=self._meta(started),
            error=None if allowed else "security policy blocked",
            risk_level=RiskLevel.CRITICAL.value if not allowed else RiskLevel.LOW.value,
        )

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
