from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.workers.base import Worker, WorkerContext, WorkerResult


class BuzzardWorker(Worker):
    """Phase 2 worker contract extending Phase 1 Worker."""

    permissions: frozenset[str] = frozenset()
    capabilities: frozenset[str] = frozenset()
    family: str = "general"
    risk_default: RiskLevel = RiskLevel.LOW
    metadata: dict[str, Any]

    def __init__(self) -> None:
        self.metadata = {
            "family": self.family,
            "capabilities": sorted(self.capabilities),
            "permissions": sorted(self.permissions),
            "risk_default": self.risk_default.value,
        }

    def check_permission(self, permission: str) -> bool:
        return permission in self.permissions or "admin" in self.permissions

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        raise NotImplementedError
