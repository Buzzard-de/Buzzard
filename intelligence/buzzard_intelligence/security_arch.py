from .json_store import JsonIntelligenceStore


class SecurityArchitecture(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            121,
            "Security Architecture",
            "buzzard_v121.json",
            path,
        )
