from .json_store import JsonIntelligenceStore


class SupplyChainCommandCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            160,
            "Supply Chain Command Center",
            "buzzard_v160.json",
            path,
        )
