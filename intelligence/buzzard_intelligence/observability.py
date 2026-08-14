from .json_store import JsonIntelligenceStore


class ObservabilityMetrics(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            137,
            "Observability & Metrics",
            "buzzard_v137.json",
            path,
        )
