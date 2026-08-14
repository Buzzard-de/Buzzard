from .json_store import JsonIntelligenceStore


class ProductRadar(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            51,
            "Product Trend Radar",
            "buzzard_v51.json",
            path,
        )
