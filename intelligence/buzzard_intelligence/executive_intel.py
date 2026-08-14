from .json_store import JsonIntelligenceStore


class ExecutiveIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            192,
            "Executive Intelligence",
            "buzzard_v192.json",
            path,
        )
