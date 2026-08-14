from .json_store import JsonIntelligenceStore


class AdBudgetOptimizer(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            177,
            "Ad Budget Optimizer",
            "buzzard_v177.json",
            path,
        )
