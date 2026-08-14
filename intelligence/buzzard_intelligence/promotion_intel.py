from .json_store import JsonIntelligenceStore


class PromotionIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            62,
            "Promotion & Discount Intelligence",
            "buzzard_v62.json",
            path,
        )
