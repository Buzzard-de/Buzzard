from .json_store import JsonIntelligenceStore


class PurchaseToSellingPrice(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            86,
            "Purchasing to Selling Price",
            "buzzard_v86.json",
            path,
        )
