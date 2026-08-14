from .json_store import JsonIntelligenceStore


class BasketAnalysis(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            167,
            "Basket Analysis",
            "buzzard_v167.json",
            path,
        )
