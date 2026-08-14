from .json_store import JsonIntelligenceStore


class SystemHealthDashboard(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            118,
            "System Health Dashboard",
            "buzzard_v118.json",
            path,
        )
