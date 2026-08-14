from .json_store import JsonIntelligenceStore


class CircuitBreaker(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            106,
            "Timeout & Circuit Breaker",
            "buzzard_v106.json",
            path,
        )
