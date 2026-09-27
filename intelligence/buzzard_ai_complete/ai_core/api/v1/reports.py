from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import authorize, get_db, get_orchestrator, get_request_id
from buzzard_ai_complete.ai_core.kurmay.service import KurmayService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator

router = APIRouter(prefix="/reports", tags=["ai-core-reports"])


@router.get("/kurmay", dependencies=[Depends(authorize)])
def list_kurmay_reports(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    service = KurmayService(db)
    items = service.list_reports(limit=page_size, offset=offset)
    return {
        "items": [
            {
                "id": r.id,
                "situation_summary": r.situation_summary,
                "risk_level": r.risk_level,
                "confidence": r.confidence,
                "content": r.content,
                "created_at": r.created_at,
            }
            for r in items
        ],
        "page": page,
        "page_size": page_size,
    }


@router.get("/kurmay/{report_id}", dependencies=[Depends(authorize)])
def get_kurmay_report(report_id: str, db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    service = KurmayService(db)
    record = service.get(report_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Kurmay report not found", "request_id": request_id},
        )
    return {
        "id": record.id,
        "situation_summary": record.situation_summary,
        "risk_level": record.risk_level,
        "confidence": record.confidence,
        "content": record.content,
        "created_at": record.created_at,
    }


@router.post("/kurmay", dependencies=[Depends(authorize)])
def trigger_kurmay(
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
    request_id: str = Depends(get_request_id),
):
    task = orchestrator.create_task(
        type="kurmay_synthesis",
        payload={"trigger": "manual", "request_id": request_id},
        created_by="api",
    )
    return {"task_id": task.id, "status": task.status}
