from .json_store import JsonIntelligenceStore


class CustomerIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            161,
            "Customer Intelligence",
            "buzzard_v161.json",
            path,
        )
