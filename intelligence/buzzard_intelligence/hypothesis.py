from .json_store import JsonIntelligenceStore


class HypothesisEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            74,
            "Hypothesis Engine",
            "buzzard_v74.json",
            path,
        )
