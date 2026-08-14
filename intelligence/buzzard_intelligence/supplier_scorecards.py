from .json_store import JsonIntelligenceStore


class SupplierScorecards(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            158,
            "Supplier Scorecards",
            "buzzard_v158.json",
            path,
        )
