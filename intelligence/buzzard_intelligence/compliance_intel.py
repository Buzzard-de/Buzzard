from .json_store import JsonIntelligenceStore


class ComplianceIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            37,
            "Risk & Compliance Intelligence Engine",
            "buzzard_v37.json",
            path,
        )
