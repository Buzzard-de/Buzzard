from .json_store import JsonIntelligenceStore


class APIGatewayLoadControl(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            136,
            "API Gateway & Load Control",
            "buzzard_v136.json",
            path,
        )
