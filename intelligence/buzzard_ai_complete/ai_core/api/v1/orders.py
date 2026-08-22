from __future__ import annotations

import hashlib
import hmac
import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import (
    enforce_api_permission,
    get_db,
    get_idempotency_key_header,
    get_request_id,
)
from buzzard_ai_complete.ai_core.services.order_service import OrderService
from buzzard_ai_complete.config import settings

router = APIRouter(prefix="/orders", tags=["ai-core-orders"])


def _verify_order_hmac(body: bytes, signature: str | None) -> bool:
    secret = settings.ORDER_WEBHOOK_SECRET
    if not secret:
        return False
    if not signature:
        return False
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    provided = signature.removeprefix("sha256=").strip()
    return hmac.compare_digest(digest, provided)


@router.get("", dependencies=[Depends(enforce_api_permission)])
def list_orders(limit: int = 50, db: Session = Depends(get_db)):
    svc = OrderService(db)
    return {
        "items": [
            {
                "id": o.id,
                "order_id": o.order_id,
                "source": o.source,
                "status": o.status,
                "customer_ref": o.customer_ref,
                "procurement": o.procurement,
            }
            for o in svc.list_orders(limit=limit)
        ]
    }


@router.post("/ingest", dependencies=[Depends(enforce_api_permission)])
async def ingest_order(
    request: Request,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_request_id),
    idempotency_key: str | None = Depends(get_idempotency_key_header),
    x_signature: Annotated[str | None, Header(alias="X-Order-Signature")] = None,
):
    body = await request.body()
    if settings.ORDER_WEBHOOK_SECRET and not _verify_order_hmac(body, x_signature):
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid order ingest signature", "request_id": request_id},
        )
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": "Invalid JSON payload", "request_id": request_id},
        ) from exc

    svc = OrderService(db)
    result = svc.ingest(payload, idempotency_key=idempotency_key)
    db.commit()
    if result.get("status") == "VALIDATION_ERROR":
        raise HTTPException(
            status_code=400,
            detail={"code": "VALIDATION_ERROR", "message": result.get("errors"), "request_id": request_id},
        )
    return result


@router.get("/{order_id}", dependencies=[Depends(enforce_api_permission)])
def get_order(order_id: str, source: str | None = None, db: Session = Depends(get_db), request_id: str = Depends(get_request_id)):
    svc = OrderService(db)
    record = svc.get_order(order_id, source=source)
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Order not found", "request_id": request_id},
        )
    return {
        "id": record.id,
        "order_id": record.order_id,
        "source": record.source,
        "status": record.status,
        "customer_ref": record.customer_ref,
        "line_items": record.line_items,
        "pricing_snapshot": record.pricing_snapshot,
        "procurement": record.procurement,
        "metadata": record.extra_metadata,
    }
