from dataclasses import dataclass


@dataclass
class VolumeTier:
    min_shipments: int
    rate: float


@dataclass
class CarrierContractV2:
    carrier: str
    tiers: list

    def rate_for_volume(self, shipments, list_rate):
        applicable = [tier for tier in self.tiers if shipments >= tier.min_shipments]
        return round(
            max(applicable, key=lambda tier: tier.min_shipments).rate if applicable else list_rate,
            2,
        )
