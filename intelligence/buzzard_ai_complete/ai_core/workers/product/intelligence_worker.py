from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.services.product_pipeline_service import ProductPipelineService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class ProductIntelligenceWorker(BuzzardWorker):
    worker_id = "product-intelligence"
    supported_task_types = frozenset({"product_enrich"})
    family = "product"
    permissions = frozenset({"product:read", "products:enrich", "memory:write"})
    capabilities = frozenset({"pim_enrichment", "attribute_extraction"})
    risk_default = RiskLevel.LOW

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        sku = str(payload.get("sku", "unknown"))
        supplier_id = payload.get("supplier_id")

        session = context.session
        if session and sku != "unknown":
            svc = ProductPipelineService(session, bridge=self._bridge)
            existing = svc.get_product_by_sku(sku, supplier_id=supplier_id)
            if existing:
                result = svc.enrich_product(sku, supplier_id=supplier_id)
                success = result.get("status") == "ok"
                return WorkerResult(
                    success=success,
                    output=result,
                    metadata=self._meta(started),
                    error=None if success else result.get("status"),
                    retryable=result.get("status") == NO_DATA_AVAILABLE,
                    risk_level=self.risk_default.value,
                    memory_entries=[
                        domain_memory_entry(
                            f"products/{sku}",
                            f"enrich/{context.task_id}",
                            result,
                        )
                    ],
                )

        product = self._bridge.read_products(sku=sku or None)
        if product.get("status") == NO_DATA_AVAILABLE:
            return WorkerResult(
                success=False,
                output=product,
                metadata=self._meta(started),
                error=NO_DATA_AVAILABLE,
                retryable=False,
                risk_level=self.risk_default.value,
                memory_entries=[
                    domain_memory_entry(
                        f"products/{sku}",
                        f"enrich/{context.task_id}",
                        product,
                    )
                ],
            )
        return WorkerResult(
            success=True,
            output=product,
            metadata=self._meta(started),
            memory_entries=[
                domain_memory_entry(
                    f"products/{sku}",
                    f"enrich/{context.task_id}",
                    product,
                )
            ],
        )

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "pipeline",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
