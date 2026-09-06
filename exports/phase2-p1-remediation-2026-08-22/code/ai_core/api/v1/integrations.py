from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import authorize, get_db, get_orchestrator
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.services.integration_status_service import IntegrationStatusService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator

router = APIRouter(prefix="/integrations", tags=["ai-core-integrations"])


@router.get("/status", dependencies=[Depends(authorize)])
def integration_status(db: Session = Depends(get_db)):
    svc = IntegrationStatusService(db)
    svc.ensure_defaults()
    svc.sync_from_registry(IntegrationStatusRegistry())
    return {"integrations": svc.list_status()}


@router.post("/suppliers/sync", dependencies=[Depends(authorize)])
def trigger_supplier_sync(orchestrator: UnifiedOrchestrator = Depends(get_orchestrator)):
    task = orchestrator.create_task(type="supplier_sync", payload={}, created_by="api")
    return {"task_id": task.id, "status": task.status}


@router.post("/products/enrich", dependencies=[Depends(authorize)])
def trigger_product_enrich(
    payload: dict | None = None,
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
):
    task = orchestrator.create_task(type="product_enrich", payload=payload or {}, created_by="api")
    return {"task_id": task.id, "status": task.status}
