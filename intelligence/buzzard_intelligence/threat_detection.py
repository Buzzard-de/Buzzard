from .json_store import JsonIntelligenceStore


class ThreatDetection(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            129,
            "Threat Detection",
            "buzzard_v129.json",
            path,
        )
