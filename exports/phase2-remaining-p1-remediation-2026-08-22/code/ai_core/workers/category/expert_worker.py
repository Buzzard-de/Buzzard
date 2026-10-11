from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.enums import MemoryImpact, MemoryType, RiskLevel
from buzzard_ai_complete.ai_core.taxonomy.loader import TaxonomyNode
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.category.bridge import analyze_category


class CategoryExpertWorker(BuzzardWorker):
    """Per-L1 category intelligence worker."""

    supported_task_types = frozenset({"category_scan", "category_analyze", "taxonomy_gap_report"})
    family = "category_intelligence"
    permissions = frozenset({"memory:write", "memory:read", "taxonomy:read"})
    capabilities = frozenset(
        {
            "assortment_scan",
            "competitor_price",
            "competitor_product",
            "trend_analysis",
            "supplier_opportunity",
            "stock_price_signal",
            "subcategory_gap",
            "quality_issue_detection",
            "taxonomy_map",
        }
    )
    risk_default = RiskLevel.LOW

    def __init__(self, node: TaxonomyNode) -> None:
        self.taxonomy_node = node
        self.worker_id = f"category-{node.id}"
        super().__init__()
        self.metadata.update(
            {
                "taxonomy_node_id": node.id,
                "category_name": node.name,
            }
        )

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        category_id = str(payload.get("category_id", self.taxonomy_node.id))
        analysis = analyze_category(category_id, self.taxonomy_node.name, payload)
        status = analysis.get("status", "NO_DATA_AVAILABLE")
        success = status == "ok"
        memory_entries: list[dict[str, Any]] = []
        if success:
            memory_entries.append(
                {
                    "namespace": f"categories/{self.taxonomy_node.id}",
                    "key": f"scan/{context.task_id}",
                    "type": MemoryType.SIGNAL.value,
                    "category": "category_intelligence",
                    "content": analysis,
                    "confidence": 0.75,
                    "impact": MemoryImpact.LOW.value,
                }
            )
        duration_ms = int((time.monotonic() - started) * 1000)
        return WorkerResult(
            success=success,
            output=analysis,
            metadata={
                "worker_id": self.worker_id,
                "execution_mode": "deterministic",
                "duration_ms": duration_ms,
                "taxonomy_node_id": self.taxonomy_node.id,
            },
            error=None if success else analysis.get("message", "category scan produced no data"),
            retryable=not success and status == "NO_DATA_AVAILABLE",
            confidence=0.75 if success else 0.0,
            risk_level=self.risk_default.value,
            memory_entries=memory_entries,
        )
