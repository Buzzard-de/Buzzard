from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import EXTERNAL_INTEGRATION_PENDING
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.integrations.factory import get_integration_registry
from buzzard_ai_complete.ai_core.integrations.suppliers.factory import get_supplier_adapter
from buzzard_ai_complete.ai_core.services.supplier_service import SupplierService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class SupplierHubWorker(BuzzardWorker):
    worker_id = "supplier-hub"
    supported_task_types = frozenset({"supplier_sync"})
    family = "supplier"
    permissions = frozenset({"supplier:read", "suppliers:read", "suppliers:sync", "memory:write"})
    capabilities = frozenset({"feed_ingest", "supplier_risk_scan"})
    risk_default = RiskLevel.MEDIUM

    def __init__(self) -> None:
        self._integrations = get_integration_registry()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        supplier_ref = str(payload.get("supplier_id", "unknown"))
        feeds_status = self._integrations.status("supplier_feeds")

        session = context.session
        if session and supplier_ref != "unknown" and feeds_status == "CONNECTED":
            svc = SupplierService(session)
            supplier = svc.get_supplier(supplier_ref) or svc.get_by_code(supplier_ref)
            if supplier:
                adapter = get_supplier_adapter(feed_type=supplier.feed_type, feed_path=supplier.feed_path)
                if adapter.is_configured():
                    result = svc.sync_supplier(supplier.id)
                    success = result.get("status") == "ok"
                    return WorkerResult(
                        success=success,
                        output=result,
                        metadata=self._meta(started),
                        error=None if success else result.get("status"),
                        retryable=result.get("status") == EXTERNAL_INTEGRATION_PENDING,
                        risk_level=self.risk_default.value,
                        memory_entries=[
                            domain_memory_entry(
                                f"suppliers/{supplier_ref}",
                                f"sync/{context.task_id}",
                                result,
                                impact=RiskLevel.MEDIUM.value,
                            )
                        ],
                    )

        if feeds_status != "CONNECTED":
            output = {
                "status": EXTERNAL_INTEGRATION_PENDING,
                "integration": "supplier_feeds",
                "supplier_id": supplier_ref,
            }
            return WorkerResult(
                success=False,
                output=output,
                metadata=self._meta(started),
                error=EXTERNAL_INTEGRATION_PENDING,
                retryable=False,
                risk_level=self.risk_default.value,
                memory_entries=[
                    domain_memory_entry(
                        f"suppliers/{supplier_ref}",
                        f"sync/{context.task_id}",
                        output,
                        impact=RiskLevel.MEDIUM.value,
                    )
                ],
            )

        return WorkerResult(
            success=True,
            output={"status": "ok", "supplier_id": supplier_ref, "mode": "integration_connected"},
            metadata=self._meta(started),
            memory_entries=[
                domain_memory_entry(
                    f"suppliers/{supplier_ref}",
                    f"sync/{context.task_id}",
                    {"status": "ok", "supplier_id": supplier_ref},
                )
            ],
        )

    def _meta(self, started: float) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "pipeline",
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
