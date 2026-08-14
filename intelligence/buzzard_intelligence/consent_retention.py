from .json_store import JsonIntelligenceStore


class ConsentRetention(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            127,
            "Consent & Retention",
            "buzzard_v127.json",
            path,
        )
