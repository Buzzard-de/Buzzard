from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry
from buzzard_ai_complete.ai_core.services.market_service import MarketIntelligenceService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class MarketIntelligenceWorker(BuzzardWorker):
    worker_id = "market-intelligence"
    supported_task_types = frozenset({"market_scan", "competitor_analysis", "trend_detection"})
    family = "market"
    permissions = frozenset({"market:read", "memory:write"})
    capabilities = frozenset({"compliant_data_ingestion", "signal_generation"})
    risk_default = RiskLevel.LOW

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
                output={"status": "NO_SESSION", "signals": []},
                metadata=self._meta(started, context),
                error="database session required",
                retryable=False,
                risk_level=self.risk_default.value,
            )

        svc = MarketIntelligenceService(session)
        scan_payload = {**payload, "signal_type": task_type}
        result = svc.scan(scan_payload)
        success = result.get("status") == "ok"
        source = str(payload.get("source", "internal_commerce"))
        output = {
            **result,
            "signals": [result] if success else [],
            "source": source,
            "confidence": float(payload.get("confidence", 0.5)),
        }
        return WorkerResult(
            success=success,
            output=output,
            metadata=self._meta(started, context),
            error=result.get("errors") if not success else None,
            retryable=False,
            risk_level=self.risk_default.value,
            memory_entries=[
                domain_memory_entry(
                    f"market/{source}",
                    f"{task_type}/{context.task_id}",
                    output,
                    impact=self.risk_default.value,
                )
            ] if success else [],
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "market_service",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
