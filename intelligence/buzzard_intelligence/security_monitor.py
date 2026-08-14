from .json_store import JsonIntelligenceStore


class SecurityMonitoring(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            128,
            "Security Monitoring",
            "buzzard_v128.json",
            path,
        )
