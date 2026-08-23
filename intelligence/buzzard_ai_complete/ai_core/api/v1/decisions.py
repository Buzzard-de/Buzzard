from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_request_id
from buzzard_ai_complete.ai_core.services.decision_service import DecisionService

router = APIRouter(prefix="/decisions", tags=["ai-core-decisions"])


@router.post("/evaluate", dependencies=[Depends(enforce_api_permission)])
def evaluate_decision(payload: dict, db: Session = Depends(get_db)):
    svc = DecisionService(db)
    result = svc.evaluate_with_autonomy(payload)
    db.commit()
    return result


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_decisions(limit: int = 50, db: Session = Depends(get_db)):
    svc = DecisionService(db)
    return {
        "items": [
            {
                "id": d.id,
                "output_type": d.output_type,
                "confidence": d.confidence,
                "signals_count": d.signals_count,
                "content": d.content,
                "created_at": d.created_at.isoformat(),
            }
            for d in svc.list_decisions(limit=limit)
        ]
    }


@router.get("/{decision_id}", dependencies=[Depends(enforce_api_permission)])
def get_decision(decision_id: str, db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    svc = DecisionService(db)
    record = svc.get_decision(decision_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Decision not found", "request_id": request_id},
        )
    return {
        "id": record.id,
        "output_type": record.output_type,
        "confidence": record.confidence,
        "signals_count": record.signals_count,
        "content": record.content,
        "task_id": record.task_id,
        "created_at": record.created_at.isoformat(),
    }
