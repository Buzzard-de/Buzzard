from .json_store import JsonIntelligenceStore


class HighAvailability(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            139,
            "High Availability",
            "buzzard_v139.json",
            path,
        )
