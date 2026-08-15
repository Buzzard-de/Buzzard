from buzzard_ai_complete.logistics.carriers import ConfigurableCarrier, DHLAdapter
from buzzard_ai_complete.logistics.models import Destination, Parcel, ShippingDecision


class SmartShippingEngine:
    """Chooses among available carrier quotes without faking unavailable providers."""

    def __init__(self, carriers=None):
        self.carriers = carriers or [
            DHLAdapter(),
            ConfigurableCarrier("DPD", countries=["DE", "FR", "BE", "NL", "AT"], price=6.90, delivery_days=2),
            ConfigurableCarrier("GLS", countries=["DE", "FR", "BE", "NL", "AT"], price=6.50, delivery_days=2),
            ConfigurableCarrier("Hermes", countries=["DE"], price=5.49, delivery_days=2),
            ConfigurableCarrier("UPS", countries=["DE", "FR", "BE", "NL", "AT"], price=8.50, delivery_days=2),
        ]

    def quotes(self, parcel, destination):
        return [c.quote(parcel, destination) for c in self.carriers]

    def choose(self, parcel, destination, priority="balanced"):
        quotes = [q for q in self.quotes(parcel, destination) if q.available]
        if not quotes:
            return ShippingDecision(None, reason="no_carrier_available")
        if priority == "fastest":
            selected = min(quotes, key=lambda q: (q.delivery_days, q.price))
        elif priority == "cheapest":
            selected = min(quotes, key=lambda q: (q.price, q.delivery_days))
        else:
            selected = min(quotes, key=lambda q: (q.price + 0.75 * q.delivery_days))
        alternatives = [q for q in quotes if q is not selected]
        return ShippingDecision(selected, alternatives, reason=f"selected_by_{priority}")

    def create_label(self, carrier, shipment):
        for c in self.carriers:
            if c.name.lower() == carrier.lower():
                return c.create_label(shipment)
        return {"status": "UNKNOWN_CARRIER", "carrier": carrier}

    def track(self, carrier, tracking_number):
        for c in self.carriers:
            if c.name.lower() == carrier.lower():
                return c.track(tracking_number)
        return {"status": "UNKNOWN_CARRIER", "carrier": carrier, "tracking_number": tracking_number}
