from dataclasses import dataclass


@dataclass
class CarrierVolumeContract:
    carrier: str
    monthly_shipments: int
    negotiated_rate: float | None = None
    discount_percent: float = 0.0

    def effective_rate(self, list_rate):
        if self.negotiated_rate is not None:
            return round(self.negotiated_rate, 2)
        return round(float(list_rate) * (1 - self.discount_percent / 100), 2)
