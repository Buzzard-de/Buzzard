from .json_store import JsonIntelligenceStore


class AnomalyEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            34,
            "Alert & Anomaly Detection Engine",
            "buzzard_v34.json",
            path,
        )
