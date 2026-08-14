from .json_store import JsonIntelligenceStore


class AgentSelfCheck(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            144,
            "Agent Self-Check",
            "buzzard_v144.json",
            path,
        )
