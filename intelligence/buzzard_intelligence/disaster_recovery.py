from .json_store import JsonIntelligenceStore


class DisasterRecovery(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            140,
            "Disaster Recovery",
            "buzzard_v140.json",
            path,
        )
