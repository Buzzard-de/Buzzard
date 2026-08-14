from .json_store import JsonIntelligenceStore


class PurchaseOrderIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            157,
            "Purchase Order Intelligence",
            "buzzard_v157.json",
            path,
        )
