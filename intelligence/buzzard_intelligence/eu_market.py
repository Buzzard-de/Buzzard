from .json_store import JsonIntelligenceStore


class EUMarketIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            92,
            "EU Market Intelligence",
            "buzzard_v92.json",
            path,
        )
