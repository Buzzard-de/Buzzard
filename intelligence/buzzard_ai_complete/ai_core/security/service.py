from __future__ import annotations

from typing import TYPE_CHECKING

from buzzard_ai_complete.agents.esat_bey.agent import EsatBey, SecurityEvent
from buzzard_ai_complete.ai_core.enums import AuditResult, RiskLevel

if TYPE_CHECKING:
    from buzzard_ai_complete.ai_core.services.audit_service import AuditService


class SecurityService:
    """Platform security facade wrapping EsatBey with optional ai_core audit dual-write."""

    def __init__(
        self,
        esat_bey: EsatBey | None = None,
        audit: AuditService | None = None,
        request_id: str | None = None,
    ) -> None:
        self._esat = esat_bey or EsatBey()
        self._audit = audit
        self._request_id = request_id or "system"

    def inspect_task(self, task_id: str, task_type: str, worker_id: str | None = None) -> dict:
        event = SecurityEvent(
            event_type="task_execution",
            severity=RiskLevel.LOW.value,
            details={"task_id": task_id, "type": task_type, "worker_id": worker_id},
        )
        return self._esat.inspect(event)

    def scan_text(self, text: str) -> dict:
        return self._esat.scan_text(text)

    def record(self, severity: str, event_type: str, message: str, actor: str = "system") -> None:
        self._esat.record(severity, event_type, message, actor=actor)
        if self._audit is not None:
            risk = RiskLevel.MEDIUM.value
            if severity.upper() in {RiskLevel.HIGH.value, RiskLevel.CRITICAL.value}:
                risk = severity.upper()
            self._audit.log(
                actor=actor,
                action=f"security.{event_type}",
                request_id=self._request_id,
                entity_type="security_event",
                entity_id=event_type,
                after_state={"message": message, "severity": severity},
                risk=risk,
                result=AuditResult.OK,
            )
