from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import authorize, get_db
from buzzard_ai_complete.ai_core.services.worker_registry_service import WorkerRegistryService
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.health import default_execution_policy, probe_worker_health
from buzzard_ai_complete.ai_core.workers.registry import get_registry
from buzzard_ai_complete.config import settings

router = APIRouter(prefix="/agents", tags=["ai-core-agents"])


def _serialize_worker(worker) -> dict:
    data = {
        "worker_id": worker.worker_id,
        "supported_task_types": sorted(worker.supported_task_types),
    }
    if isinstance(worker, BuzzardWorker):
        data.update(
            {
                "family": worker.family,
                "capabilities": sorted(worker.capabilities),
                "permissions": sorted(worker.permissions),
                "risk_default": worker.risk_default.value,
                "metadata": worker.metadata,
            }
        )
        data["execution_policy"] = default_execution_policy(worker).__dict__
    return data


@router.get("", dependencies=[Depends(authorize)])
def list_agents(db: Session = Depends(get_db)):
    registry = get_registry()
    if settings.BUZZARD_AI_CORE_V2:
        WorkerRegistryService(db).sync_registry(registry)
        db.commit()
    workers = registry.list_workers()
    return {
        "total": len(workers),
        "workers": [_serialize_worker(w) for w in workers],
    }


@router.get("/{worker_id}", dependencies=[Depends(authorize)])
def get_agent(worker_id: str):
    registry = get_registry()
    worker = registry.get(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Worker not found"})
    return _serialize_worker(worker)


@router.post("/{worker_id}/health-check", dependencies=[Depends(authorize)])
def health_check_agent(worker_id: str):
    registry = get_registry()
    worker = registry.get(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Worker not found"})
    health = probe_worker_health(worker)
    return {
        "worker_id": worker_id,
        "healthy": health.healthy,
        "status": health.status,
        "checks": health.checks,
        "message": health.message,
    }
