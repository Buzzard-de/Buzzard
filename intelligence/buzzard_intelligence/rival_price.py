from .json_store import JsonIntelligenceStore


class RivalPriceTracker(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            48,
            "Competitor Price Tracking",
            "buzzard_v48.json",
            path,
        )
