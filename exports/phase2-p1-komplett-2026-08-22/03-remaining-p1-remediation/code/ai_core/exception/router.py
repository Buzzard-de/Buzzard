from __future__ import annotations

from typing import Any


class AssignmentRouter:
    """Deterministic exception assignment by type and severity."""

    DEFAULT_OWNERS: dict[str, str] = {
        "WORKER_EXECUTION_FAILED": "operations",
        "WORKER_HALTED": "platform-ops",
        "SECURITY_BLOCKED": "security-ai",
        "LOW_MARGIN": "price-engine",
        "CUSTOMS_CLASSIFICATION": "customs-classifier",
        "ORDER_ANOMALY": "order-engine",
    }

    def assign(self, exception_type: str, severity: str, worker_id: str | None = None) -> dict[str, Any]:
        owner = self.DEFAULT_OWNERS.get(exception_type)
        if worker_id and not owner:
            owner = worker_id
        if severity in {"CRITICAL", "HIGH"} and exception_type.startswith("SECURITY"):
            owner = "security-ai"
        return {
            "owner": owner,
            "severity": severity,
            "exception_type": exception_type,
            "worker_id": worker_id,
        }
