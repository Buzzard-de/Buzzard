from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.carriers.base import CarrierAdapter, ShipmentRequest
from buzzard_ai_complete.ai_core.integrations.carriers.dhl import DhlCarrierAdapter


class CarrierIntegrationAdapter(IntegrationAdapter):
    integration_id = "carrier"

    def __init__(self, adapters: dict[str, CarrierAdapter] | None = None) -> None:
        self._adapters: dict[str, CarrierAdapter] = adapters or {"dhl": DhlCarrierAdapter()}

    def is_configured(self) -> bool:
        return any(adapter.is_configured() for adapter in self._adapters.values())

    def status(self) -> str:
        if not self.is_configured():
            return "EXTERNAL_INTEGRATION_PENDING"
        health = self.health_check()
        if health.get("status") == "CONNECTED":
            return "CONNECTED"
        return "EXTERNAL_INTEGRATION_PENDING"

    def health_check(self) -> dict[str, Any]:
        carriers = {
            carrier_id: "CONNECTED" if adapter.is_configured() else "EXTERNAL_INTEGRATION_PENDING"
            for carrier_id, adapter in self._adapters.items()
        }
        connected = any(status == "CONNECTED" for status in carriers.values())
        return {
            "status": "CONNECTED" if connected else "EXTERNAL_INTEGRATION_PENDING",
            "integration": self.integration_id,
            "carriers": carriers,
        }

    def connect(self) -> dict[str, Any]:
        health = self.health_check()
        return {
            "integration_id": self.integration_id,
            "status": health.get("status"),
            "configured": self.is_configured(),
            "health": health,
        }

    def get_adapter(self, carrier_id: str) -> CarrierAdapter | None:
        return self._adapters.get(carrier_id.lower())

    def get_rates(self, carrier_id: str, shipment: ShipmentRequest) -> dict[str, Any]:
        adapter = self.get_adapter(carrier_id)
        if not adapter:
            return {"status": "UNKNOWN_CARRIER", "carrier_id": carrier_id}
        quotes = adapter.get_rates(shipment)
        return {
            "status": "ok",
            "carrier_id": carrier_id,
            "quotes": [q.to_dict() for q in quotes],
        }
