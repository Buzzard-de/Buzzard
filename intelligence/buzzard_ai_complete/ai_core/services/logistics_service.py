from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.integrations.carriers.base import ShipmentRequest
from buzzard_ai_complete.ai_core.integrations.carrier_adapter import CarrierIntegrationAdapter
from buzzard_ai_complete.ai_core.models.shipment_record import ShipmentRecord
from buzzard_ai_complete.config import settings


class LogisticsService:
    def __init__(self, session: Session, carrier_adapter: CarrierIntegrationAdapter | None = None) -> None:
        self._session = session
        self._carrier = carrier_adapter or CarrierIntegrationAdapter()

    def quote_rate(self, payload: dict[str, Any]) -> dict[str, Any]:
        carrier_id = str(payload.get("carrier_id", "dhl")).lower()
        shipment = ShipmentRequest(
            order_id=payload.get("order_id"),
            weight_kg=float(payload.get("weight_kg", 1.0)),
            destination_country=str(payload.get("destination_country", "DE")),
            destination_postal=str(payload.get("destination_postal", "10115")),
            service_level=str(payload.get("service_level", "standard")),
        )
        return self._carrier.get_rates(carrier_id, shipment)

    def create_label(self, payload: dict[str, Any], *, idempotency_key: str | None = None) -> dict[str, Any]:
        carrier_id = str(payload.get("carrier_id", "dhl")).lower()
        adapter = self._carrier.get_adapter(carrier_id)
        if not adapter:
            return {"status": "UNKNOWN_CARRIER", "carrier_id": carrier_id}

        rate_amount = float(payload.get("rate_amount", 0))
        if rate_amount > settings.LOGISTICS_LABEL_APPROVAL_THRESHOLD:
            return {
                "status": "APPROVAL_REQUIRED",
                "carrier_id": carrier_id,
                "rate_amount": rate_amount,
                "threshold": settings.LOGISTICS_LABEL_APPROVAL_THRESHOLD,
                "message": "Label creation above threshold requires approval",
            }

        shipment = ShipmentRequest(
            order_id=payload.get("order_id"),
            weight_kg=float(payload.get("weight_kg", 1.0)),
            destination_country=str(payload.get("destination_country", "DE")),
            destination_postal=str(payload.get("destination_postal", "10115")),
        )
        result = adapter.create_label(shipment, idempotency_key=idempotency_key)
        if result.get("status") == "LABEL_CREATED":
            record = ShipmentRecord(
                order_id=payload.get("order_id"),
                carrier_id=carrier_id,
                tracking_number=result.get("tracking_number"),
                status="label_created",
                label_url=result.get("label_url"),
                rate_amount=rate_amount or None,
                extra_metadata={"idempotency_key": idempotency_key},
            )
            self._session.add(record)
            self._session.flush()
            result["shipment_id"] = record.id
        return result
