from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.intelligence.pricing.policy import PriceCandidate, PricingPolicyEngine
from buzzard_ai_complete.ai_core.models.pricing_candidate import PricingCandidateRecord
from buzzard_ai_complete.ai_core.services.event_service import EventService


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PricingService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._engine = PricingPolicyEngine()

    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        candidate = PriceCandidate(
            sku=str(payload.get("sku", "")),
            supplier_cost=float(payload.get("supplier_cost", 0)),
            recommended_price=float(payload.get("recommended_price", 0)),
            currency=str(payload.get("currency", "EUR")),
            taxonomy_id=payload.get("taxonomy_id"),
            min_margin=payload.get("min_margin"),
            max_discount=payload.get("max_discount"),
        )
        policy = self._engine.evaluate(candidate)
        record = PricingCandidateRecord(
            sku=candidate.sku,
            supplier_cost=candidate.supplier_cost,
            recommended_price=candidate.recommended_price,
            margin=policy.margin,
            currency=candidate.currency,
            taxonomy_id=candidate.taxonomy_id,
            status=policy.status,
            approval_required=policy.approval_required,
            policy_result=policy.to_dict(),
            extra_metadata=payload.get("metadata") or {},
        )
        self._session.add(record)
        self._session.flush()
        return {
            "status": "ok",
            "candidate_id": record.id,
            "policy": policy.to_dict(),
            "publish": self._engine.publish_gate(candidate, policy),
        }

    def publish(self, candidate_id: str) -> dict[str, Any]:
        record = self._session.get(PricingCandidateRecord, candidate_id)
        if not record:
            return {"status": "NOT_FOUND"}
        if record.approval_required:
            return {"status": "APPROVAL_REQUIRED", "candidate_id": candidate_id}
        if record.status == "BLOCKED":
            return {"status": "BLOCKED", "candidate_id": candidate_id}
        record.status = "PUBLISHED"
        record.updated_at = utcnow()
        self._session.flush()
        EventService(self._session).emit(
            "pricing.published",
            {"candidate_id": candidate_id, "sku": record.sku, "price": record.recommended_price},
            source="pricing-service",
            correlation_id=candidate_id,
        )
        return {"status": "ok", "candidate_id": candidate_id, "sku": record.sku, "price": record.recommended_price}

    def list_candidates(self, *, limit: int = 50) -> list[PricingCandidateRecord]:
        return list(
            self._session.scalars(
                select(PricingCandidateRecord).order_by(PricingCandidateRecord.created_at.desc()).limit(limit)
            )
        )
