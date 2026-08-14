from .json_store import JsonIntelligenceStore


class LandedCostCalculator(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            67,
            "Landed Cost Calculator",
            "buzzard_v67.json",
            path,
        )
