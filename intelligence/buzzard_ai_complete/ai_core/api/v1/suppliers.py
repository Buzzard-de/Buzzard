from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_orchestrator, get_request_id
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.ai_core.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["ai-core-suppliers"])


def _serialize_supplier(record) -> dict[str, Any]:
    return {
        "id": record.id,
        "supplier_code": record.supplier_code,
        "name": record.name,
        "feed_type": record.feed_type,
        "feed_path": record.feed_path,
        "status": record.status,
        "last_synced_at": record.last_synced_at.isoformat() if record.last_synced_at else None,
        "metadata": record.extra_metadata,
    }


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_suppliers(db: Session = Depends(get_db)):
    svc = SupplierService(db)
    return {"items": [_serialize_supplier(s) for s in svc.list_suppliers()]}


@router.post("", dependencies=[Depends(enforce_api_permission)])
def create_supplier(payload: dict[str, Any], db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    code = str(payload.get("supplier_code") or "").strip()
    name = str(payload.get("name") or "").strip()
    if not code or not name:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "supplier_code and name required", "request_id": request_id},
        )
    svc = SupplierService(db)
    if svc.get_by_code(code):
        raise HTTPException(
            status_code=409,
            detail={"code": "CONFLICT", "message": "supplier_code already exists", "request_id": request_id},
        )
    record = svc.create_supplier(
        supplier_code=code,
        name=name,
        feed_type=str(payload.get("feed_type") or "rest"),
        feed_path=payload.get("feed_path"),
        credential=payload.get("credential"),
        metadata=payload.get("metadata") or {},
    )
    db.commit()
    return _serialize_supplier(record)


@router.get("/{supplier_id}", dependencies=[Depends(enforce_api_permission)])
def get_supplier(supplier_id: str, db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    svc = SupplierService(db)
    record = svc.get_supplier(supplier_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Supplier not found", "request_id": request_id},
        )
    return _serialize_supplier(record)


@router.post("/{supplier_id}/sync", dependencies=[Depends(enforce_api_permission)])
def sync_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
    request_id: str = Depends(get_request_id),
):
    svc = SupplierService(db)
    if not svc.get_supplier(supplier_id):
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Supplier not found", "request_id": request_id},
        )
    result = svc.sync_supplier(supplier_id)
    db.commit()
    if result.get("status") == "EXTERNAL_INTEGRATION_PENDING":
        task = orchestrator.create_task(
            type="supplier_sync",
            payload={"supplier_id": supplier_id},
            created_by="api",
        )
        result["task_id"] = task.id
    return result
