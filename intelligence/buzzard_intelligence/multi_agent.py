from .json_store import JsonIntelligenceStore


class MultiAgentCollaboration(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            73,
            "Multi-Agent Collaboration",
            "buzzard_v73.json",
            path,
        )
