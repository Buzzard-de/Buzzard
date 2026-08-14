from .json_store import JsonIntelligenceStore


class FactCheckingEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            75,
            "Fact Checking & Counter Verification",
            "buzzard_v75.json",
            path,
        )
