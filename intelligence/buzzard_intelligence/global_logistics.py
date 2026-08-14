from .json_store import JsonIntelligenceStore


class GlobalLogisticsIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            98,
            "Global Logistics Intelligence",
            "buzzard_v98.json",
            path,
        )
