from .json_store import JsonIntelligenceStore


class DemandToPurchasing(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            85,
            "Demand to Purchasing",
            "buzzard_v85.json",
            path,
        )
