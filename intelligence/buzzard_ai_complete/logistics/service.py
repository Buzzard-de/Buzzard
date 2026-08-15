from buzzard_ai_complete.logistics.engine import SmartShippingEngine
from buzzard_ai_complete.logistics.models import Destination, Parcel


class SmartShippingService:
    def __init__(self, engine=None):
        self.engine = engine or SmartShippingEngine()

    def recommend(
        self,
        weight_kg,
        length_cm,
        width_cm,
        height_cm,
        country,
        postal_code,
        priority="balanced",
    ):
        parcel = Parcel(weight_kg, length_cm, width_cm, height_cm)
        destination = Destination(country, postal_code)
        return self.engine.choose(parcel, destination, priority)
