from .json_store import JsonIntelligenceStore


class SupplierVerifier(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            53,
            "Supplier Verification",
            "buzzard_v53.json",
            path,
        )
