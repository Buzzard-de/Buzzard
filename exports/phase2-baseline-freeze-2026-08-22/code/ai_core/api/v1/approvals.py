from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import authorize, get_db
from buzzard_ai_complete.ai_core.models.approval_record import ApprovalRecord
from buzzard_ai_complete.ai_core.schemas.api import ApprovalResponse, PaginatedResponse

router = APIRouter(prefix="/approvals", tags=["ai-core-approvals"])


def _serialize_approval(record: ApprovalRecord) -> ApprovalResponse:
    return ApprovalResponse.model_validate(record)


@router.get("", response_model=PaginatedResponse[ApprovalResponse], dependencies=[Depends(authorize)])
def list_approvals(
    task_id: str | None = None,
    decision: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(ApprovalRecord).order_by(ApprovalRecord.created_at.desc())
    if task_id:
        query = query.filter(ApprovalRecord.task_id == task_id)
    if decision:
        query = query.filter(ApprovalRecord.decision == decision)
    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    return PaginatedResponse(
        items=[_serialize_approval(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(items) < total,
    )


@router.get("/{approval_id}", response_model=ApprovalResponse, dependencies=[Depends(authorize)])
def get_approval(approval_id: str, db: Session = Depends(get_db)):
    record = db.get(ApprovalRecord, approval_id)
    if not record:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Approval not found"})
    return _serialize_approval(record)
