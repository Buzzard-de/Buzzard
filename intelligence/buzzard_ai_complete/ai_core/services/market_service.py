from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.intelligence.market.compliance import MarketSourceValidator
from buzzard_ai_complete.ai_core.models.decision_record import DecisionRecord
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService


class MarketIntelligenceService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._validator = MarketSourceValidator()

    def ingest_signal(self, payload: dict[str, Any]) -> dict[str, Any]:
        allowed, errors = self._validator.validate_payload(payload)
        if not allowed:
            return {"status": "REJECTED", "errors": errors}

        record = DecisionRecord(
            output_type="MARKET_SIGNAL",
            confidence=float(payload.get("confidence", 0.5)),
            signals_count=1,
            content={
                "source": payload.get("source"),
                "signal_type": payload.get("signal_type", "market_scan"),
                "data": payload.get("data", {}),
                "taxonomy_id": payload.get("taxonomy_id"),
            },
        )
        self._session.add(record)
        self._session.flush()
        return {
            "status": "ok",
            "decision_id": record.id,
            "source": payload.get("source"),
            "signal_type": payload.get("signal_type", "market_scan"),
        }

    def scan(self, payload: dict[str, Any]) -> dict[str, Any]:
        source = str(payload.get("source", "internal_commerce"))
        return self.ingest_signal(
            {
                "source": source,
                "signal_type": "market_scan",
                "confidence": payload.get("confidence", 0.7),
                "data": payload.get("data", {}),
                "taxonomy_id": payload.get("taxonomy_id"),
            }
        )
