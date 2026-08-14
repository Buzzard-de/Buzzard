from .json_store import JsonIntelligenceStore


class GermanyMarketIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            91,
            "Germany Market Intelligence",
            "buzzard_v91.json",
            path,
        )
