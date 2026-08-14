from .json_store import JsonIntelligenceStore


class AgentHealthMonitor(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            113,
            "Agent Health Monitor",
            "buzzard_v113.json",
            path,
        )
