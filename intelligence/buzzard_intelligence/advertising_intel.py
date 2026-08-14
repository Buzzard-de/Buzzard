from .json_store import JsonIntelligenceStore


class AdvertisingIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            60,
            "Advertising Intelligence",
            "buzzard_v60.json",
            path,
        )
