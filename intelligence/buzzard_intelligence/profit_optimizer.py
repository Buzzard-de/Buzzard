from .json_store import JsonIntelligenceStore


class ProfitOptimizer(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            68,
            "Advanced Profitability Optimizer",
            "buzzard_v68.json",
            path,
        )
