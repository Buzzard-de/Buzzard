from .json_store import JsonIntelligenceStore


class SupplierDiscoveryAdvanced(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            152,
            "Supplier Discovery Advanced",
            "buzzard_v152.json",
            path,
        )
