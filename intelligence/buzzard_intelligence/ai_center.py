from .json_store import JsonIntelligenceStore


class AIIntelligenceCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            100,
            "Buzzard AI Intelligence Center",
            "buzzard_v100.json",
            path,
        )
