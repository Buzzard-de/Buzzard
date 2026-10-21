from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from buzzard_ai_complete.ai_core.api.deps import authorize
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.registry import get_registry

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
    return data


@router.get("", dependencies=[Depends(authorize)])
def list_agents():
    registry = get_registry()
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
    healthy = True
    if isinstance(worker, BuzzardWorker):
        healthy = bool(worker.capabilities)
    return {"worker_id": worker_id, "healthy": healthy, "status": "HEALTHY" if healthy else "DEGRADED"}
