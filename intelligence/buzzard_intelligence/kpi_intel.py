from .json_store import JsonIntelligenceStore


class KPIIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            194,
            "KPI Intelligence",
            "buzzard_v194.json",
            path,
        )
