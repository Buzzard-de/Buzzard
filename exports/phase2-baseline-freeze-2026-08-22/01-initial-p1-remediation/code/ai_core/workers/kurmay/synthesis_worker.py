from __future__ import annotations

import time
import uuid
from typing import Any

from buzzard_ai_complete.ai_core.enums import MemoryImpact, MemoryType, RiskLevel
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.kurmay.rule_engine import KurmayRuleEngine


class KurmaySynthesisWorker(BuzzardWorker):
    worker_id = "kurmay"
    supported_task_types = frozenset({"kurmay_synthesis"})
    family = "kurmay"
    permissions = frozenset({"memory:read", "memory:write", "report:write"})
    capabilities = frozenset({"strategic_synthesis", "executive_digest"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._engine = KurmayRuleEngine()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        memory_entries = list(payload.get("memory_entries") or [])
        exception_entries = list(payload.get("exceptions") or [])
        report_id = str(payload.get("report_id", uuid.uuid4()))
        report = self._engine.synthesize(report_id, memory_entries, exception_entries)
        memory_writes: list[dict[str, Any]] = [
            {
                "namespace": "insights/kurmay",
                "key": report.report_id,
                "type": MemoryType.INSIGHT.value,
                "category": "kurmay",
                "content": report.to_dict(),
                "confidence": report.confidence,
                "impact": MemoryImpact.MEDIUM.value,
            }
        ]
        return WorkerResult(
            success=True,
            output=report.to_dict(),
            metadata={
                "worker_id": self.worker_id,
                "execution_mode": "deterministic",
                "duration_ms": int((time.monotonic() - started) * 1000),
            },
            confidence=report.confidence,
            risk_level=report.risk_level,
            memory_entries=memory_writes,
        )
