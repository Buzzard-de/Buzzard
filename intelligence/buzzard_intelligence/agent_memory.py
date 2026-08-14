from .json_store import JsonIntelligenceStore


class AgentMemoryRetrieval(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            142,
            "Agent Memory Retrieval",
            "buzzard_v142.json",
            path,
        )
