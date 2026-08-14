from .json_store import JsonIntelligenceStore


class MarketEntryPlanner(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            79,
            "Market Entry Planner",
            "buzzard_v79.json",
            path,
        )
