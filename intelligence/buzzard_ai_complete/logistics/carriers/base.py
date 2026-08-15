from abc import ABC, abstractmethod

from buzzard_ai_complete.logistics.models import CarrierQuote, Destination, Parcel


class CarrierAdapter(ABC):
    name = "base"

    @abstractmethod
    def quote(self, parcel: Parcel, destination: Destination) -> CarrierQuote:
        raise NotImplementedError

    def create_label(self, shipment: dict):
        return {"status": "NOT_CONFIGURED", "carrier": self.name}

    def track(self, tracking_number: str):
        return {"status": "NOT_CONFIGURED", "carrier": self.name, "tracking_number": tracking_number}
