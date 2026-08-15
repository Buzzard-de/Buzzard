from dataclasses import dataclass, field
from typing import List


@dataclass
class Parcel:
    weight_kg: float
    length_cm: float
    width_cm: float
    height_cm: float


@dataclass
class Destination:
    country: str
    postal_code: str


@dataclass
class CarrierQuote:
    carrier: str
    service: str
    price: float
    currency: str = "EUR"
    delivery_days: int = 0
    available: bool = True
    reason: str = ""


@dataclass
class ShippingDecision:
    selected: CarrierQuote | None
    alternatives: List[CarrierQuote] = field(default_factory=list)
    reason: str = ""
