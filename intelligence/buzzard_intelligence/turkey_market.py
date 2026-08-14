from .json_store import JsonIntelligenceStore


class TurkeyMarketIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            93,
            "Türkiye Market Intelligence",
            "buzzard_v93.json",
            path,
        )
