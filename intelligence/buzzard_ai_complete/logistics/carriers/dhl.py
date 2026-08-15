import os

from buzzard_ai_complete.logistics.carriers.base import CarrierAdapter
from buzzard_ai_complete.logistics.models import CarrierQuote


class DHLAdapter(CarrierAdapter):
    name = "DHL"

    def __init__(self):
        self.configured = all(
            os.getenv(k) for k in ("DHL_API_KEY", "DHL_API_SECRET", "DHL_USERNAME", "DHL_PASSWORD")
        )

    def quote(self, parcel, destination):
        if not self.configured:
            return CarrierQuote(self.name, "standard", 0, available=False, reason="not_configured")
        return CarrierQuote(self.name, "standard", 0, available=False, reason="provider_quote_not_implemented")

    def create_label(self, shipment):
        return {
            "status": "NOT_CONFIGURED" if not self.configured else "READY_FOR_PROVIDER_CALL",
            "carrier": self.name,
        }

    def track(self, tracking_number):
        return {
            "status": "NOT_CONFIGURED" if not self.configured else "READY_FOR_PROVIDER_CALL",
            "carrier": self.name,
            "tracking_number": tracking_number,
        }
