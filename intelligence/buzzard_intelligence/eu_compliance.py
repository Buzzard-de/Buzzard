from .json_store import JsonIntelligenceStore


class EUComplianceMonitor(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            65,
            "EU & Germany Compliance Monitor",
            "buzzard_v65.json",
            path,
        )
