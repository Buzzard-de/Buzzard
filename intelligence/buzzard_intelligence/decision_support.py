from .json_store import JsonIntelligenceStore


class DecisionSupportCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            197,
            "Decision Support Center",
            "buzzard_v197.json",
            path,
        )
