from .json_store import JsonIntelligenceStore


class LocalMarketplaceIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            99,
            "Local Marketplace Intelligence",
            "buzzard_v99.json",
            path,
        )
