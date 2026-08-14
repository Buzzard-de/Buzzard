from .json_store import JsonIntelligenceStore


class MarketLaunchOperations(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            188,
            "Market Launch Operations",
            "buzzard_v188.json",
            path,
        )
