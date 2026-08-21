from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class PriceEngineWorker(BuzzardWorker):
    worker_id = "price-engine"
    supported_task_types = frozenset({"price_recheck"})
    family = "pricing"
    permissions = frozenset({"price:read", "price:calculate", "memory:write"})
    capabilities = frozenset({"margin_calculation", "threshold_check"})
    risk_default = RiskLevel.HIGH

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        if payload.get("force_failure"):
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(started, context),
                error=payload.get("error_message", "price check failed"),
                retryable=bool(payload.get("retryable", True)),
                risk_level=self.risk_default.value,
            )

        sku = str(payload.get("sku", "UNKNOWN"))
        if "base_price" in payload:
            base_price = float(payload.get("base_price", 10.0))
            margin = float(payload.get("margin", 0.2))
            recommended = round(base_price * (1 + margin), 2)
            below = recommended < float(payload.get("min_price", 0))
            return WorkerResult(
                success=True,
                output={
                    "sku": sku,
                    "base_price": base_price,
                    "margin": margin,
                    "recommended_price": recommended,
                    "below_threshold": below,
                    "data_source": "payload",
                },
                metadata=self._meta(started, context),
                confidence=0.9,
                risk_level=RiskLevel.HIGH.value if below else RiskLevel.MEDIUM.value,
            )

        product = self._bridge.read_products(sku=sku)
        if product.get("status") == NO_DATA_AVAILABLE:
            return WorkerResult(
                success=False,
                output={
                    "sku": sku,
                    "status": NO_DATA_AVAILABLE,
                    "message": "no commerce price data; supply base_price in payload for deterministic check",
                },
                metadata=self._meta(started, context),
                error=NO_DATA_AVAILABLE,
                retryable=False,
                risk_level=self.risk_default.value,
            )
        return WorkerResult(success=True, output=product, metadata=self._meta(started, context))

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }
