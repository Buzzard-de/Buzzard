from .json_store import JsonIntelligenceStore


class RivalProductTracker(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            46,
            "Competitor Product Tracking",
            "buzzard_v46.json",
            path,
        )
