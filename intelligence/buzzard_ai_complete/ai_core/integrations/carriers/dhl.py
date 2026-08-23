from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.carriers.base import CarrierAdapter, RateQuote, ShipmentRequest
from buzzard_ai_complete.config import settings


class DhlCarrierAdapter(CarrierAdapter):
    carrier_id = "dhl"

    def is_configured(self) -> bool:
        if settings.DHL_USE_MOCK:
            return True
        return bool(settings.DHL_API_URL and settings.DHL_API_KEY)

    def get_rates(self, shipment: ShipmentRequest) -> list[RateQuote]:
        if not self.is_configured():
            return [
                RateQuote(
                    carrier_id=self.carrier_id,
                    service="standard",
                    amount=0.0,
                    available=False,
                    reason="EXTERNAL_INTEGRATION_PENDING",
                )
            ]
        if settings.DHL_USE_MOCK or not settings.DHL_API_URL:
            base = 5.99 + max(0.0, shipment.weight_kg - 1.0) * 1.25
            return [
                RateQuote(
                    carrier_id=self.carrier_id,
                    service="standard",
                    amount=round(base, 2),
                    currency="EUR",
                    available=True,
                ),
                RateQuote(
                    carrier_id=self.carrier_id,
                    service="express",
                    amount=round(base * 1.8, 2),
                    currency="EUR",
                    available=True,
                ),
            ]
        return [
            RateQuote(
                carrier_id=self.carrier_id,
                service="standard",
                amount=0.0,
                available=False,
                reason="provider_quote_not_implemented",
            )
        ]

    def create_label(
        self,
        shipment: ShipmentRequest,
        *,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "EXTERNAL_INTEGRATION_PENDING",
                "carrier_id": self.carrier_id,
                "message": "DHL_API_URL and DHL_API_KEY required",
            }
        if settings.DHL_USE_MOCK or not settings.DHL_API_URL:
            tracking = f"DHL-MOCK-{idempotency_key or shipment.order_id or '000'}"[:32]
            return {
                "status": "LABEL_CREATED",
                "carrier_id": self.carrier_id,
                "tracking_number": tracking,
                "label_url": f"https://mock.dhl.local/labels/{tracking}",
                "idempotency_key": idempotency_key,
            }
        return {
            "status": "READY_FOR_PROVIDER_CALL",
            "carrier_id": self.carrier_id,
            "message": "Live DHL label API not configured for this environment",
        }

    def track(self, tracking_number: str) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "EXTERNAL_INTEGRATION_PENDING",
                "carrier_id": self.carrier_id,
                "tracking_number": tracking_number,
            }
        if settings.DHL_USE_MOCK or tracking_number.startswith("DHL-MOCK-"):
            return {
                "status": "in_transit",
                "carrier_id": self.carrier_id,
                "tracking_number": tracking_number,
                "events": [{"code": "transit", "description": "Package in transit"}],
            }
        return {
            "status": "READY_FOR_PROVIDER_CALL",
            "carrier_id": self.carrier_id,
            "tracking_number": tracking_number,
        }
