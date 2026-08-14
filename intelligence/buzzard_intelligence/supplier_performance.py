from .json_store import JsonIntelligenceStore


class SupplierPerformance(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            54,
            "Supplier Performance Tracking",
            "buzzard_v54.json",
            path,
        )
