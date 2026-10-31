from __future__ import annotations

from typing import Any

from buzzard_ai_complete.agents.esat_bey.agent import EsatBey, SecurityEvent
from buzzard_ai_complete.ai_core.enums import RiskLevel


class SecurityService:
    """Platform security facade wrapping EsatBey."""

    def __init__(self, esat_bey: EsatBey | None = None) -> None:
        self._esat = esat_bey or EsatBey()

    def inspect_task(self, task_id: str, task_type: str, worker_id: str | None = None) -> dict[str, Any]:
        event = SecurityEvent(
            event_type="task_execution",
            severity=RiskLevel.LOW.value,
            details={"task_id": task_id, "type": task_type, "worker_id": worker_id},
        )
        return self._esat.inspect(event)

    def scan_text(self, text: str) -> dict[str, Any]:
        return self._esat.scan_text(text)

    def record(self, severity: str, event_type: str, message: str, actor: str = "system") -> None:
        self._esat.record(severity, event_type, message, actor=actor)
