from .json_store import JsonIntelligenceStore


class GlobalOperationsCommandCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            190,
            "Global Operations Command Center",
            "buzzard_v190.json",
            path,
        )
