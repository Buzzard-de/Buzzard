from .json_store import JsonIntelligenceStore


class IntelligenceDashboard(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            39,
            "Intelligence Dashboard Engine",
            "buzzard_v39.json",
            path,
        )
