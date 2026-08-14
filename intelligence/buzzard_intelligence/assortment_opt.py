from .json_store import JsonIntelligenceStore


class AssortmentOptimizer(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            89,
            "Assortment Optimization",
            "buzzard_v89.json",
            path,
        )
