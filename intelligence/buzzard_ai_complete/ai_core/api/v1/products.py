from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_orchestrator, get_request_id
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.ai_core.services.product_pipeline_service import ProductPipelineService

router = APIRouter(prefix="/products", tags=["ai-core-products"])


def _serialize_product(record) -> dict[str, Any]:
    return {
        "id": record.id,
        "sku": record.sku,
        "supplier_id": record.supplier_id,
        "name": record.name,
        "description": record.description,
        "brand": record.brand,
        "price": record.price,
        "currency": record.currency,
        "stock_qty": record.stock_qty,
        "taxonomy_id": record.taxonomy_id,
        "storefront_category_id": record.storefront_category_id,
        "ean": record.ean,
        "enrichment_status": record.enrichment_status,
        "metadata": record.extra_metadata,
    }


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_products(
    supplier_id: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    svc = ProductPipelineService(db)
    return {"items": [_serialize_product(p) for p in svc.list_products(supplier_id=supplier_id, limit=limit)]}


@router.get("/{sku}", dependencies=[Depends(enforce_api_permission)])
def get_product(
    sku: str,
    supplier_id: str | None = None,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_request_id),
):
    svc = ProductPipelineService(db)
    record = svc.get_product_by_sku(sku, supplier_id=supplier_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Product not found", "request_id": request_id},
        )
    return _serialize_product(record)


@router.post("/{sku}/enrich", dependencies=[Depends(enforce_api_permission)])
def enrich_product(
    sku: str,
    payload: dict[str, Any] | None = None,
    db: Session = Depends(get_db),
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
    request_id: str = Depends(get_request_id),
):
    body = payload or {}
    supplier_id = body.get("supplier_id")
    svc = ProductPipelineService(db)
    result = svc.enrich_product(sku, supplier_id=supplier_id)
    db.commit()
    if result.get("status") == "NOT_FOUND":
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Product not found", "request_id": request_id},
        )
    if result.get("status") != "ok":
        task = orchestrator.create_task(
            type="product_enrich",
            payload={"sku": sku, "supplier_id": supplier_id},
            created_by="api",
        )
        result["task_id"] = task.id
    return result
