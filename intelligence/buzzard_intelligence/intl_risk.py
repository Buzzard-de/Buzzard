from .json_store import JsonIntelligenceStore


class InternationalRiskCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            189,
            "International Risk Center",
            "buzzard_v189.json",
            path,
        )
