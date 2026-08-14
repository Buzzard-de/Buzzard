from .json_store import JsonIntelligenceStore


class AgentEvaluation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            143,
            "Agent Evaluation",
            "buzzard_v143.json",
            path,
        )
