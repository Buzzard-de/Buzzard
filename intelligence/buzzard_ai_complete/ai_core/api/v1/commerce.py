from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_actor, get_actor_role, get_orchestrator, get_request_id
from buzzard_ai_complete.ai_core.schemas.api import CommerceWriteRequest, TaskResponse
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator

router = APIRouter(prefix="/commerce", tags=["ai-core-commerce"])


@router.post("/write", response_model=TaskResponse, status_code=201, dependencies=[Depends(enforce_api_permission)])
def create_commerce_write_task(
    body: CommerceWriteRequest,
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
    actor: str = Depends(get_actor),
    request_id: str = Depends(get_request_id),
):
    try:
        return orchestrator.create_task(
            type="commerce_write",
            payload={
                "action": body.action,
                "write_payload": body.payload,
            },
            requires_approval=True,
            created_by=actor,
            priority=body.priority,
            auto_start=True,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": str(exc), "request_id": request_id},
        )
