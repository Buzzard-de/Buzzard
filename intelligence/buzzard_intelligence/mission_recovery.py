from .json_store import JsonIntelligenceStore


class MissionRecoveryManager(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            114,
            "Mission Recovery Manager",
            "buzzard_v114.json",
            path,
        )
