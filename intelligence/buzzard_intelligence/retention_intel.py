from .json_store import JsonIntelligenceStore


class RetentionIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            168,
            "Retention Intelligence",
            "buzzard_v168.json",
            path,
        )
