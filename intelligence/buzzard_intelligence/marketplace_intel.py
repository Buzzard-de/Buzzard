from .json_store import JsonIntelligenceStore


class MarketplaceIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            58,
            "Marketplace Intelligence",
            "buzzard_v58.json",
            path,
        )
