from .json_store import JsonIntelligenceStore


class ShippingIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            57,
            "Shipping & Delivery Intelligence",
            "buzzard_v57.json",
            path,
        )
