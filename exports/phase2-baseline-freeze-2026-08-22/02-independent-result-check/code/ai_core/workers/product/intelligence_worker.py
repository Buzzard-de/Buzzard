from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


class ProductIntelligenceWorker(BuzzardWorker):
    worker_id = "product-intelligence"
    supported_task_types = frozenset({"product_enrich"})
    family = "product"
    permissions = frozenset({"product:read", "memory:write"})
    capabilities = frozenset({"pim_enrichment", "attribute_extraction"})
    risk_default = RiskLevel.LOW

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        sku = str(payload.get("sku", ""))
        product = self._bridge.read_products(sku=sku or None)
        if product.get("status") == NO_DATA_AVAILABLE:
            return WorkerResult(
                success=False,
                output=product,
                metadata=self._meta(started),
                error=NO_DATA_AVAILABLE,
                retryable=False,
                risk_level=self.risk_default.value,
            )
        return WorkerResult(success=True, output=product, metadata=self._meta(started))

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "deterministic",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
