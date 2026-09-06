from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.workers.base import Worker, WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.provider import EXTERNAL_AI_PROVIDER_PENDING, get_ai_provider


class CategoryScanWorker(Worker):
    worker_id = "category-worker"
    supported_task_types = frozenset({"category_scan"})

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        if payload.get("force_failure"):
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(context, started),
                error=payload.get("error_message", "forced worker failure"),
                retryable=bool(payload.get("retryable", True)),
            )
        fail_until = payload.get("fail_until_attempt")
        if fail_until is not None and context.attempt < int(fail_until):
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(context, started),
                error=f"attempt {context.attempt} failed; retry required",
                retryable=True,
            )
        scope = str(payload.get("scope", "default"))
        seed = payload.get("categories") or [scope, "general", "verified"]
        categories = sorted({str(c).strip() for c in seed if str(c).strip()})
        return WorkerResult(
            success=True,
            output={
                "scope": scope,
                "categories_found": len(categories),
                "categories": categories,
                "checksum": sum(len(c) for c in categories),
            },
            metadata=self._meta(context, started),
        )

    def _meta(self, context: WorkerContext, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }


class PriceRecheckWorker(Worker):
    worker_id = "price-engine"
    supported_task_types = frozenset({"price_recheck"})

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        if payload.get("force_failure"):
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(context, started),
                error=payload.get("error_message", "price check failed"),
                retryable=bool(payload.get("retryable", True)),
            )
        sku = str(payload.get("sku", "UNKNOWN"))
        base_price = float(payload.get("base_price", 10.0))
        margin = float(payload.get("margin", 0.2))
        recommended = round(base_price * (1 + margin), 2)
        return WorkerResult(
            success=True,
            output={
                "sku": sku,
                "base_price": base_price,
                "margin": margin,
                "recommended_price": recommended,
                "below_threshold": recommended < float(payload.get("min_price", 0)),
            },
            metadata=self._meta(context, started),
        )

    def _meta(self, context: WorkerContext, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }


class SystemHealthWorker(Worker):
    worker_id = "aslan-bey-orchestrator"
    supported_task_types = frozenset({"system_health"})

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        checks = {
            "database": payload.get("database", "ok"),
            "queue": payload.get("queue", "ok"),
            "workers": payload.get("workers", "ok"),
        }
        healthy = all(v == "ok" for v in checks.values())
        return WorkerResult(
            success=healthy,
            output={"checks": checks, "healthy": healthy},
            metadata={
                "worker_id": self.worker_id,
                "execution_mode": "deterministic",
                "duration_ms": int((time.monotonic() - started) * 1000),
                "attempt": context.attempt,
            },
            error=None if healthy else "system health check failed",
            retryable=True,
        )


class CustomTaskWorker(Worker):
    worker_id = "central-orchestrator"
    supported_task_types = frozenset({"custom"})

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        if payload.get("force_failure"):
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(context, started),
                error=payload.get("error_message", "custom task failed"),
                retryable=bool(payload.get("retryable", True)),
            )
        if payload.get("simulate_timeout"):
            time.sleep(max(context.timeout_seconds, 1))
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(context, started),
                error="simulated timeout",
                retryable=True,
            )
        action = str(payload.get("action", "noop"))
        return WorkerResult(
            success=True,
            output={"action": action, "processed": True, "input_keys": sorted(payload.keys())},
            metadata=self._meta(context, started),
        )

    def _meta(self, context: WorkerContext, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
        }


class CustomerServiceWorker(Worker):
    worker_id = "customer-service-ai"
    supported_task_types = frozenset({"customer_service"})

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        provider = get_ai_provider()
        if provider.is_configured():
            try:
                provider.generate(str(payload.get("question", "")))
            except Exception as exc:
                return WorkerResult(
                    success=False,
                    output={},
                    metadata=self._meta(context, started, EXTERNAL_AI_PROVIDER_PENDING),
                    error=str(exc),
                    retryable=False,
                )
        # Deterministic fallback — never fake LLM output.
        return WorkerResult(
            success=True,
            output={
                "ticket_id": payload.get("ticket_id", context.task_id),
                "resolution": "queued_for_human_review",
                "message": payload.get("question", ""),
            },
            metadata=self._meta(context, started, EXTERNAL_AI_PROVIDER_PENDING),
        )

    def _meta(self, context: WorkerContext, started: float, ai_status: str) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "ai_provider_status": ai_status,
            "attempt": context.attempt,
        }
