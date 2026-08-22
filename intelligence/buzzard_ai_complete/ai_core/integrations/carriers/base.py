from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ShipmentRequest:
    order_id: str | None
    weight_kg: float
    destination_country: str
    destination_postal: str
    service_level: str = "standard"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RateQuote:
    carrier_id: str
    service: str
    amount: float
    currency: str = "EUR"
    available: bool = True
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "carrier_id": self.carrier_id,
            "service": self.service,
            "amount": self.amount,
            "currency": self.currency,
            "available": self.available,
            "reason": self.reason,
        }


class CarrierAdapter(ABC):
    carrier_id: str

    @abstractmethod
    def is_configured(self) -> bool:
        ...

    @abstractmethod
    def get_rates(self, shipment: ShipmentRequest) -> list[RateQuote]:
        ...

    @abstractmethod
    def create_label(
        self,
        shipment: ShipmentRequest,
        *,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        ...

    @abstractmethod
    def track(self, tracking_number: str) -> dict[str, Any]:
        ...
