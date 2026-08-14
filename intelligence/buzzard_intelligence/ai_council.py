from .json_store import JsonIntelligenceStore


class AICouncilIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            150,
            "AI Council Intelligence",
            "buzzard_v150.json",
            path,
        )
