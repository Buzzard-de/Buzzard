from .json_store import JsonIntelligenceStore


class SupplierPriceCompare(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            55,
            "Supplier Price Comparison",
            "buzzard_v55.json",
            path,
        )
