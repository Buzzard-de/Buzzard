from .json_store import JsonIntelligenceStore


class AdvancedReasoningEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            141,
            "Advanced Reasoning Engine",
            "buzzard_v141.json",
            path,
        )
