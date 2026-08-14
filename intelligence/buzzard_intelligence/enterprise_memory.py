from .json_store import JsonIntelligenceStore


class EnterpriseMemory(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            198,
            "Enterprise Memory",
            "buzzard_v198.json",
            path,
        )
