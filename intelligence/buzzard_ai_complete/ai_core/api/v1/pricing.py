from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_request_id
from buzzard_ai_complete.ai_core.services.pricing_service import PricingService

router = APIRouter(prefix="/pricing", tags=["ai-core-pricing"])


@router.post("/evaluate", dependencies=[Depends(enforce_api_permission)])
def evaluate_pricing(payload: dict[str, Any], db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    sku = str(payload.get("sku", "")).strip()
    if not sku:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "sku required", "request_id": request_id},
        )
    svc = PricingService(db)
    result = svc.evaluate(payload)
    db.commit()
    return result


@router.post("/publish", dependencies=[Depends(enforce_api_permission)])
def publish_pricing(payload: dict[str, Any], db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    candidate_id = str(payload.get("candidate_id", "")).strip()
    if not candidate_id:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "candidate_id required", "request_id": request_id},
        )
    svc = PricingService(db)
    result = svc.publish(candidate_id)
    db.commit()
    if result.get("status") == "NOT_FOUND":
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Pricing candidate not found", "request_id": request_id},
        )
    return result


@router.get("/candidates", dependencies=[Depends(enforce_api_permission)])
def list_pricing_candidates(limit: int = 50, db: Session = Depends(get_db)):
    svc = PricingService(db)
    return {
        "items": [
            {
                "id": c.id,
                "sku": c.sku,
                "recommended_price": c.recommended_price,
                "margin": c.margin,
                "status": c.status,
                "approval_required": c.approval_required,
                "taxonomy_id": c.taxonomy_id,
            }
            for c in svc.list_candidates(limit=limit)
        ]
    }
