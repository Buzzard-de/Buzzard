from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_request_id
from buzzard_ai_complete.ai_core.services.returns_service import ReturnsService

router = APIRouter(prefix="/returns", tags=["ai-core-returns"])


@router.post("/evaluate", dependencies=[Depends(enforce_api_permission)])
def evaluate_return(payload: dict, db: Session = Depends(get_db)):
    svc = ReturnsService(db)
    result = svc.evaluate(payload)
    db.commit()
    return result


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_returns(limit: int = 50, db: Session = Depends(get_db)):
    svc = ReturnsService(db)
    return {
        "items": [
            {
                "id": r.id,
                "order_id": r.order_id,
                "status": r.status,
                "eligibility": r.eligibility,
                "refund_amount": r.refund_amount,
                "approval_required": r.approval_required,
            }
            for r in svc.list_returns(limit=limit)
        ]
    }


@router.get("/{return_id}", dependencies=[Depends(enforce_api_permission)])
def get_return(return_id: str, db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    from fastapi import HTTPException

    svc = ReturnsService(db)
    record = svc.get_return(return_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Return not found", "request_id": request_id},
        )
    return {
        "id": record.id,
        "order_id": record.order_id,
        "status": record.status,
        "reason": record.reason,
        "eligibility": record.eligibility,
        "refund_amount": record.refund_amount,
        "approval_required": record.approval_required,
        "metadata": record.extra_metadata,
    }
