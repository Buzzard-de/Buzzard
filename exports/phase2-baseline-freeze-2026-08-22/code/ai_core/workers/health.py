from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker


@dataclass(frozen=True)
class ExecutionPolicy:
    """Runtime execution constraints for a worker."""

    max_attempts: int = 3
    timeout_seconds: int = 60
    retryable_on_failure: bool = True
    requires_approval: bool = False


@dataclass
class WorkerHealth:
    """Health probe result for a registered worker."""

    worker_id: str
    healthy: bool
    status: str
    checks: dict[str, Any] = field(default_factory=dict)
    message: str | None = None


def default_execution_policy(worker: BuzzardWorker) -> ExecutionPolicy:
    requires_approval = worker.risk_default.value in {"HIGH", "CRITICAL"}
    return ExecutionPolicy(
        max_attempts=3,
        timeout_seconds=60,
        retryable_on_failure=True,
        requires_approval=requires_approval,
    )


def probe_worker_health(worker) -> WorkerHealth:
    """Probe worker readiness without fabricating external connectivity."""
    worker_id = getattr(worker, "worker_id", "unknown")
    checks: dict[str, Any] = {}

    if not isinstance(worker, BuzzardWorker):
        return WorkerHealth(
            worker_id=worker_id,
            healthy=bool(getattr(worker, "supported_task_types", None)),
            status="HEALTHY" if getattr(worker, "supported_task_types", None) else "DEGRADED",
            checks={"worker_type": type(worker).__name__},
        )

    checks["capabilities"] = sorted(worker.capabilities)
    checks["permissions"] = sorted(worker.permissions)
    checks["family"] = worker.family

    if worker.family == "category_intelligence":
        node_id = worker.metadata.get("taxonomy_node_id")
        registry = TaxonomyRegistry()
        node = registry.get_node(node_id) if node_id else None
        checks["taxonomy_node"] = node_id
        checks["taxonomy_registered"] = node is not None
        healthy = bool(worker.capabilities) and node is not None
        status = "HEALTHY" if healthy else "DEGRADED"
        if not node:
            return WorkerHealth(
                worker_id=worker_id,
                healthy=False,
                status=status,
                checks=checks,
                message="taxonomy node missing from master taxonomy",
            )
        return WorkerHealth(worker_id=worker_id, healthy=healthy, status=status, checks=checks)

    integration_map = {
        "supplier": "supplier_feeds",
        "product": "commerce",
        "pricing": "commerce",
        "stock": "wms",
        "order": "commerce",
    }
    integration_id = integration_map.get(worker.family)
    if integration_id:
        integration_status = IntegrationStatusRegistry().status(integration_id)
        checks["integration_id"] = integration_id
        checks["integration_status"] = integration_status
        # Worker is operational; external integration may still be pending.
        healthy = bool(worker.capabilities)
        status = "HEALTHY" if healthy else "DEGRADED"
        if integration_status != "CONNECTED":
            checks["external_dependency"] = integration_status
        return WorkerHealth(worker_id=worker_id, healthy=healthy, status=status, checks=checks)

    healthy = bool(worker.capabilities)
    return WorkerHealth(
        worker_id=worker_id,
        healthy=healthy,
        status="HEALTHY" if healthy else "DEGRADED",
        checks=checks,
    )
