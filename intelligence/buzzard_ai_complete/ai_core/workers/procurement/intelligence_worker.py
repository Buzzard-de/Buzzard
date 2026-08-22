from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.services.procurement_service import ProcurementService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class ProcurementIntelligenceWorker(BuzzardWorker):
    worker_id = "procurement-intelligence"
    supported_task_types = frozenset({"supplier_selection", "purchase_order_draft"})
    family = "procurement"
    permissions = frozenset({"suppliers:read", "stock:read", "procurement:draft", "memory:write"})
    capabilities = frozenset({"supplier_scoring", "po_generation"})
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

        svc = ProcurementService(session)
        if task_type == "supplier_selection":
            result = svc.select_supplier(payload)
            success = result.get("status") == "ok"
        else:
            result = svc.draft_purchase_order(
                payload,
                idempotency_key=payload.get("idempotency_key") or f"po-{context.task_id}",
            )
            success = result.get("status") in {"DRAFT_CREATED", "APPROVAL_REQUIRED"}
            if result.get("duplicate"):
                success = True

        order_id = str(payload.get("order_id", context.task_id))
        risk = RiskLevel.HIGH.value if result.get("requires_approval") else self.risk_default.value
        return WorkerResult(
            success=success,
            output={**result, "status": result.get("status", "ok")},
            metadata=self._meta(started, context),
            error=None if success else result.get("status"),
            retryable=False,
            risk_level=risk,
            memory_entries=[
                domain_memory_entry(
                    f"procurement/{order_id}",
                    f"{task_type}/{context.task_id}",
                    result,
                    impact=risk,
                )
            ],
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "procurement_service",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
