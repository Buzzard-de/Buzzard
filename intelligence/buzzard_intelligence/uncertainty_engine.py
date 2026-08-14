from .json_store import JsonIntelligenceStore


class UncertaintyEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            147,
            "Uncertainty Engine",
            "buzzard_v147.json",
            path,
        )
