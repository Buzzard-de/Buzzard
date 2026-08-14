from .json_store import JsonIntelligenceStore


class SupplierNegotiationIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            153,
            "Supplier Negotiation Intelligence",
            "buzzard_v153.json",
            path,
        )
