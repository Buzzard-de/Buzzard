from .json_store import JsonIntelligenceStore


class MarketRadar(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            49,
            "Market Trend Radar",
            "buzzard_v49.json",
            path,
        )
