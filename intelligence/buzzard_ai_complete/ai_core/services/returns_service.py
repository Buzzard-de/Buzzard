from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.intelligence.returns.eligibility import ReturnEligibilityEngine
from buzzard_ai_complete.ai_core.models.order_record import OrderRecord
from buzzard_ai_complete.ai_core.models.return_record import ReturnRecord


class ReturnsService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._engine = ReturnEligibilityEngine()

    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        order_id = str(payload.get("order_id", "")).strip()
        reason = payload.get("reason")
        source = payload.get("source")

        order = self._session.scalar(
            select(OrderRecord).where(OrderRecord.order_id == order_id)
        )
        order_total = None
        order_created_at = None
        line_items: list[dict[str, Any]] = []
        if order:
            order_created_at = order.created_at
            line_items = order.line_items or []
            pricing = order.pricing_snapshot or {}
            order_total = pricing.get("total") or pricing.get("order_total")

        evaluation = self._engine.evaluate(
            order_id=order_id,
            reason=str(reason) if reason else None,
            order_total=float(order_total) if order_total is not None else None,
            order_created_at=order_created_at,
            line_items=line_items,
        )

        record = ReturnRecord(
            order_id=order_id,
            status="evaluated",
            reason=str(reason) if reason else None,
            eligibility=evaluation.eligibility,
            refund_amount=evaluation.refund_amount,
            approval_required=True,
            extra_metadata={"source": source, "violations": evaluation.violations},
        )
        self._session.add(record)
        self._session.flush()

        result = evaluation.to_dict()
        result["return_id"] = record.id
        result["requires_approval"] = True
        return result

    def list_returns(self, limit: int = 50) -> list[ReturnRecord]:
        return list(self._session.scalars(select(ReturnRecord).limit(limit)))

    def get_return(self, return_id: str) -> ReturnRecord | None:
        return self._session.get(ReturnRecord, return_id)
