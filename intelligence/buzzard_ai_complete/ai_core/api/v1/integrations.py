from __future__ import annotations

import hashlib
import hmac
import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db, get_orchestrator, get_request_id
from buzzard_ai_complete.ai_core.integrations.factory import get_integration_registry
from buzzard_ai_complete.ai_core.services.event_service import EventService
from buzzard_ai_complete.ai_core.services.integration_status_service import IntegrationStatusService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.config import settings

router = APIRouter(prefix="/integrations", tags=["ai-core-integrations"])


def _verify_commerce_hmac(body: bytes, signature: str | None) -> bool:
    secret = settings.COMMERCE_WEBHOOK_SECRET
    if not secret:
        return False
    if not signature:
        return False
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    provided = signature.removeprefix("sha256=").strip()
    return hmac.compare_digest(digest, provided)


@router.get("/status", dependencies=[Depends(enforce_api_permission)])
def integration_status(db: Session = Depends(get_db)):
    svc = IntegrationStatusService(db)
    svc.ensure_defaults()
    registry = get_integration_registry()
    svc.sync_from_registry(registry)
    return {"integrations": svc.list_status()}


@router.post("/suppliers/sync", dependencies=[Depends(enforce_api_permission)])
def trigger_supplier_sync(orchestrator: UnifiedOrchestrator = Depends(get_orchestrator)):
    task = orchestrator.create_task(type="supplier_sync", payload={}, created_by="api")
    return {"task_id": task.id, "status": task.status}


@router.post("/products/enrich", dependencies=[Depends(enforce_api_permission)])
def trigger_product_enrich(
    payload: dict | None = None,
    orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
):
    task = orchestrator.create_task(type="product_enrich", payload=payload or {}, created_by="api")
    return {"task_id": task.id, "status": task.status}


@router.post("/webhooks/commerce")
async def commerce_webhook(
    request: Request,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_request_id),
    x_signature: Annotated[str | None, Header(alias="X-Commerce-Signature")] = None,
):
    body = await request.body()
    if settings.COMMERCE_WEBHOOK_SECRET and not _verify_commerce_hmac(body, x_signature):
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid webhook signature", "request_id": request_id},
        )
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Invalid JSON payload", "request_id": request_id},
        ) from exc
    event_type = str(payload.get("event_type") or payload.get("type") or "commerce.webhook.received")
    events = EventService(db)
    record = events.emit(
        event_type,
        payload,
        source="commerce-webhook",
        correlation_id=request_id,
    )
    return {"accepted": True, "event_id": record.id, "status": record.status}


def _verify_carrier_hmac(body: bytes, signature: str | None) -> bool:
    secret = settings.CARRIER_WEBHOOK_SECRET
    if not secret:
        return False
    if not signature:
        return False
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    provided = signature.removeprefix("sha256=").strip()
    return hmac.compare_digest(digest, provided)


@router.post("/webhooks/carrier/{carrier_id}")
async def carrier_webhook(
    carrier_id: str,
    request: Request,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_request_id),
    x_signature: Annotated[str | None, Header(alias="X-Carrier-Signature")] = None,
):
    body = await request.body()
    if settings.CARRIER_WEBHOOK_SECRET and not _verify_carrier_hmac(body, x_signature):
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid carrier webhook signature", "request_id": request_id},
        )
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Invalid JSON payload", "request_id": request_id},
        ) from exc
    event_type = str(payload.get("event_type") or payload.get("type") or "carrier.webhook.received")
    events = EventService(db)
    record = events.emit(
        event_type,
        {**payload, "carrier_id": carrier_id},
        source=f"carrier-webhook:{carrier_id}",
        correlation_id=request_id,
    )
    return {"accepted": True, "event_id": record.id, "status": record.status, "carrier_id": carrier_id}
