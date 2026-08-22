from __future__ import annotations

import hashlib
import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import (
    enforce_api_permission,
    get_db,
    get_request_id,
)
from buzzard_ai_complete.ai_core.services.event_service import EventService
from buzzard_ai_complete.ai_core.services.idempotency_service import IdempotencyService
from buzzard_ai_complete.config import settings

router = APIRouter(prefix="/events", tags=["ai-core-events"])


class ReplayRequest(BaseModel):
    note: str | None = None


def _serialize_event(record) -> dict:
    return {
        "event_id": record.id,
        "event_type": record.event_type,
        "status": record.status,
        "source": record.source,
        "correlation_id": record.correlation_id,
        "causation_id": record.causation_id,
        "payload": record.payload,
        "retry_count": record.retry_count,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "processed_at": record.processed_at.isoformat() if record.processed_at else None,
        "last_error": record.last_error,
    }


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_events(
    status: str | None = None,
    event_type: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    svc = EventService(db)
    offset = (page - 1) * page_size
    items = svc.list_events(status=status, event_type=event_type, limit=page_size, offset=offset)
    total = svc.count_events(status=status, event_type=event_type)
    return {
        "items": [_serialize_event(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/dead-letter", dependencies=[Depends(enforce_api_permission)])
def list_dead_letter(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    svc = EventService(db)
    offset = (page - 1) * page_size
    items = svc.list_dead_letter(limit=page_size, offset=offset)
    return {
        "items": [
            {
                "event_id": item.id,
                "event_type": item.event_type,
                "status": item.status,
                "retry_count": item.retry_count,
                "correlation_id": item.correlation_id,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "last_error": item.last_error,
            }
            for item in items
        ],
        "total": svc.count_events(status=EventService.STATUS_DEAD_LETTER),
        "page": page,
        "page_size": page_size,
    }


@router.get("/{event_id}", dependencies=[Depends(enforce_api_permission)])
def get_event(event_id: str, db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    svc = EventService(db)
    record = svc.get(event_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Event not found", "request_id": request_id},
        )
    return _serialize_event(record)


@router.post("/{event_id}/replay", dependencies=[Depends(enforce_api_permission)])
def replay_event(
    event_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_request_id),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "Idempotency-Key header required for replay",
                "request_id": request_id,
            },
        )
    idem = IdempotencyService(db)
    existing = idem.get(idempotency_key)
    if existing and existing.result:
        return existing.result

    svc = EventService(db)
    try:
        replay = svc.replay(event_id, actor="admin", idempotency_key=idempotency_key)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Event not found", "request_id": request_id},
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "POLICY_VIOLATION", "message": str(exc), "request_id": request_id},
        )
    result = _serialize_event(replay)
    idem.complete(idempotency_key, result, resource_id=replay.id)
    return result
