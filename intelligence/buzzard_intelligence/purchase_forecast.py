from .json_store import JsonIntelligenceStore


class PurchaseForecasting(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            154,
            "Purchase Forecasting",
            "buzzard_v154.json",
            path,
        )
