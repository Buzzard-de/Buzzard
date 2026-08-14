from .json_store import JsonIntelligenceStore


class APIRetryBackoff(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            104,
            "API Retry & Backoff",
            "buzzard_v104.json",
            path,
        )
