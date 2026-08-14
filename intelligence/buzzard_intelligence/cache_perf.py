from .json_store import JsonIntelligenceStore


class CachePerformance(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            133,
            "Cache & Performance",
            "buzzard_v133.json",
            path,
        )
