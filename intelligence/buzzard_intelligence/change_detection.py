from .json_store import JsonIntelligenceStore


class ChangeDetection(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            45,
            "Change Detection",
            "buzzard_v45.json",
            path,
        )
