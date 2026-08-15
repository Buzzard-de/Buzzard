from buzzard_ai_complete.logistics.carriers.base import CarrierAdapter
from buzzard_ai_complete.logistics.models import CarrierQuote


class ConfigurableCarrier(CarrierAdapter):
    def __init__(self, name, price=0.0, delivery_days=0, countries=None):
        self.name = name
        self.price = float(price)
        self.delivery_days = int(delivery_days)
        self.countries = set(c.upper() for c in (countries or []))

    def quote(self, parcel, destination):
        if self.countries and destination.country.upper() not in self.countries:
            return CarrierQuote(self.name, "standard", 0, available=False, reason="country_not_supported")
        return CarrierQuote(self.name, "standard", self.price, delivery_days=self.delivery_days)
