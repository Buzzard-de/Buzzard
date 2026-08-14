from .json_store import JsonIntelligenceStore


class PromotionOptimization(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            179,
            "Promotion Optimization",
            "buzzard_v179.json",
            path,
        )
