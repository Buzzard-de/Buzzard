from .json_store import JsonIntelligenceStore


class StockIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            56,
            "Stock & Availability Intelligence",
            "buzzard_v56.json",
            path,
        )
