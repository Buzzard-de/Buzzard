from .json_store import JsonIntelligenceStore


class RateLimitManager(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            105,
            "Rate Limit Manager",
            "buzzard_v105.json",
            path,
        )
