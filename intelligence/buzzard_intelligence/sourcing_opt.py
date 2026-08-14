from .json_store import JsonIntelligenceStore


class SourcingOptimization(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            159,
            "Sourcing Optimization",
            "buzzard_v159.json",
            path,
        )
