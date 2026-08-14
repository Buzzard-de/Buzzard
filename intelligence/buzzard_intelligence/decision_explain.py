from .json_store import JsonIntelligenceStore


class DecisionExplanation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            146,
            "Decision Explanation",
            "buzzard_v146.json",
            path,
        )
