from .json_store import JsonIntelligenceStore


class DynamicPriceOptimizer(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            81,
            "Dynamic Price Optimization",
            "buzzard_v81.json",
            path,
        )
