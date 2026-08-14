from .json_store import JsonIntelligenceStore


class CrossSellIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            87,
            "Cross-Sell Intelligence",
            "buzzard_v87.json",
            path,
        )
