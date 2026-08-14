from .json_store import JsonIntelligenceStore


class CashFlowIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            195,
            "Cash Flow Intelligence",
            "buzzard_v195.json",
            path,
        )
