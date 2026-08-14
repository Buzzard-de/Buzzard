from .json_store import JsonIntelligenceStore


class ROASForecasting(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            178,
            "ROAS Forecasting",
            "buzzard_v178.json",
            path,
        )
