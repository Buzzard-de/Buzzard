from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.provider import EXTERNAL_AI_PROVIDER_PENDING, get_ai_provider


class CustomerServiceAIWorker(BuzzardWorker):
    worker_id = "customer-service-ai"
    supported_task_types = frozenset({"customer_service"})
    family = "customer_service"
    permissions = frozenset({"crm:read", "memory:write"})
    capabilities = frozenset({"intent_classification", "draft_response", "ticket_triage"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._integrations = IntegrationStatusRegistry()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        crm_status = self._integrations.status("crm")
        provider = get_ai_provider()
        llm_status = self._integrations.status("llm_provider")

        if crm_status != "CONNECTED":
            return WorkerResult(
                success=True,
                output={
                    "status": "EXTERNAL_INTEGRATION_PENDING",
                    "integration": "crm",
                    "ticket_id": payload.get("ticket_id", context.task_id),
                    "resolution": "queued_for_human_review",
                    "message": payload.get("question", ""),
                },
                metadata=self._meta(started, EXTERNAL_AI_PROVIDER_PENDING),
                confidence=0.5,
                risk_level=self.risk_default.value,
            )

        if provider.is_configured():
            try:
                draft = provider.generate(str(payload.get("question", "")))
                return WorkerResult(
                    success=True,
                    output={
                        "ticket_id": payload.get("ticket_id", context.task_id),
                        "resolution": "draft_response",
                        "message": payload.get("question", ""),
                        "draft_response": draft,
                        "llm_status": llm_status,
                    },
                    metadata=self._meta(started, "CONNECTED"),
                    confidence=0.8,
                    risk_level=RiskLevel.LOW.value,
                )
            except Exception as exc:
                return WorkerResult(
                    success=False,
                    output={},
                    metadata=self._meta(started, EXTERNAL_AI_PROVIDER_PENDING),
                    error=str(exc),
                    retryable=False,
                    risk_level=self.risk_default.value,
                )

        return WorkerResult(
            success=True,
            output={
                "ticket_id": payload.get("ticket_id", context.task_id),
                "resolution": "queued_for_human_review",
                "message": payload.get("question", ""),
                "llm_status": llm_status,
            },
            metadata=self._meta(started, EXTERNAL_AI_PROVIDER_PENDING),
            confidence=0.5,
            risk_level=RiskLevel.MEDIUM.value,
        )

    def _meta(self, started: float, ai_status: str) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "ai_provider_status": ai_status,
        }
