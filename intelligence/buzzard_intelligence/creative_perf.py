from .json_store import JsonIntelligenceStore


class CreativePerformance(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            173,
            "Creative Performance",
            "buzzard_v173.json",
            path,
        )
