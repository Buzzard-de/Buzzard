from .json_store import JsonIntelligenceStore


class MultiAgentDebate(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            145,
            "Multi-Agent Debate",
            "buzzard_v145.json",
            path,
        )
