from .json_store import JsonIntelligenceStore


class ProductDiscoveryIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            77,
            "Product Discovery",
            "buzzard_v77.json",
            path,
        )
