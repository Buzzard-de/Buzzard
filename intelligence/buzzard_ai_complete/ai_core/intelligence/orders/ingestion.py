from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from buzzard_ai_complete.ai_core.services.idempotency_service import IdempotencyService


@dataclass
class OrderIngestRequest:
    order_id: str
    source: str
    customer_ref: str | None = None
    line_items: list[dict[str, Any]] = field(default_factory=list)
    pricing_snapshot: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class OrderIngestionService:
    """Idempotent order ingestion with validation."""

    REQUIRED_FIELDS = ("order_id", "source")

    def __init__(self, session, idempotency: IdempotencyService | None = None) -> None:
        self._session = session
        self._idempotency = idempotency or IdempotencyService(session)

    def validate(self, payload: dict[str, Any]) -> tuple[OrderIngestRequest | None, list[str]]:
        errors: list[str] = []
        for field_name in self.REQUIRED_FIELDS:
            if not str(payload.get(field_name, "")).strip():
                errors.append(f"{field_name} is required")
        line_items = payload.get("line_items") or []
        if not isinstance(line_items, list):
            errors.append("line_items must be a list")
        if errors:
            return None, errors
        return (
            OrderIngestRequest(
                order_id=str(payload["order_id"]).strip(),
                source=str(payload["source"]).strip(),
                customer_ref=payload.get("customer_ref"),
                line_items=line_items,
                pricing_snapshot=payload.get("pricing_snapshot") or {},
                metadata=payload.get("metadata") or {},
            ),
            [],
        )

    def ingest(self, payload: dict[str, Any], *, idempotency_key: str | None = None) -> dict[str, Any]:
        request, errors = self.validate(payload)
        if request is None:
            return {"status": "VALIDATION_ERROR", "errors": errors}

        from sqlalchemy import select

        from buzzard_ai_complete.ai_core.models.order_record import OrderRecord

        existing = self._session.scalar(
            select(OrderRecord).where(
                OrderRecord.order_id == request.order_id,
                OrderRecord.source == request.source,
            )
        )
        if existing:
            return {
                "status": "ok",
                "duplicate": True,
                "order_id": existing.order_id,
                "record_id": existing.id,
            }

        key = idempotency_key or f"order-ingest:{request.source}:{request.order_id}"

        def _handler() -> dict[str, Any]:
            from sqlalchemy import select

            from buzzard_ai_complete.ai_core.models.order_record import OrderRecord

            existing = self._session.scalar(
                select(OrderRecord).where(
                    OrderRecord.order_id == request.order_id,
                    OrderRecord.source == request.source,
                )
            )
            if existing:
                return {
                    "status": "ok",
                    "duplicate": True,
                    "order_id": existing.order_id,
                    "record_id": existing.id,
                }

            record = OrderRecord(
                order_id=request.order_id,
                source=request.source,
                customer_ref=request.customer_ref,
                line_items=request.line_items,
                pricing_snapshot=request.pricing_snapshot,
                status="ingested",
                extra_metadata=request.metadata,
            )
            self._session.add(record)
            self._session.flush()
            return {
                "status": "ok",
                "duplicate": False,
                "order_id": record.order_id,
                "record_id": record.id,
            }

        return self._idempotency.execute_once(
            key,
            resource_type="order_ingest",
            handler=_handler,
        )
