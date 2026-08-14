from .json_store import JsonIntelligenceStore


class SeasonalityIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            63,
            "Seasonality Intelligence",
            "buzzard_v63.json",
            path,
        )
