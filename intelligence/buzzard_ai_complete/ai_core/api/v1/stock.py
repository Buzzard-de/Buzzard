from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_request_id
from buzzard_ai_complete.ai_core.services.stock_service import StockService

router = APIRouter(prefix="/stock", tags=["ai-core-stock"])


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_stock(sku: str | None = None, limit: int = 50, db: Session = Depends(get_db)):
    svc = StockService(db)
    snapshots = svc.list_snapshots(sku=sku, limit=limit)
    return {
        "items": [
            {
                "id": s.id,
                "sku": s.sku,
                "available_stock": s.available_stock,
                "supplier_stock": s.supplier_stock,
                "wms_stock": s.wms_stock,
                "reserved_stock": s.reserved_stock,
                "conflict": s.conflict,
                "reconciled_at": s.reconciled_at.isoformat(),
            }
            for s in snapshots
        ]
    }


@router.post("/sync", dependencies=[Depends(enforce_api_permission)])
def sync_stock(payload: dict[str, Any], db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    sku = str(payload.get("sku", "")).strip()
    if not sku:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "sku required", "request_id": request_id},
        )
    svc = StockService(db)
    result = svc.sync_stock(sku, safety_stock=int(payload.get("safety_stock", 0)))
    db.commit()
    return result
