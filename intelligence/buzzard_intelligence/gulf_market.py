from .json_store import JsonIntelligenceStore


class GulfMarketIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            94,
            "Gulf Market Intelligence",
            "buzzard_v94.json",
            path,
        )
