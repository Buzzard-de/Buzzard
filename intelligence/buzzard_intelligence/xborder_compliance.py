from .json_store import JsonIntelligenceStore


class CrossBorderCompliance(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            183,
            "Cross-Border Compliance",
            "buzzard_v183.json",
            path,
        )
