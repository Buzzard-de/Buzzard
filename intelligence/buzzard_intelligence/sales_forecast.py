from .json_store import JsonIntelligenceStore


class SalesForecasting(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            164,
            "Sales Forecasting",
            "buzzard_v164.json",
            path,
        )
