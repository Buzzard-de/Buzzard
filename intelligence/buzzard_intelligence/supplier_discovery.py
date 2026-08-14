from .json_store import JsonIntelligenceStore


class SupplierDiscoveryIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            78,
            "Supplier Discovery",
            "buzzard_v78.json",
            path,
        )
