from .json_store import JsonIntelligenceStore


class LocalLogisticsNetwork(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            185,
            "Local Logistics Network",
            "buzzard_v185.json",
            path,
        )
