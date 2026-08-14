from .json_store import JsonIntelligenceStore


class CustomerServiceIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            169,
            "Customer Service Intelligence",
            "buzzard_v169.json",
            path,
        )
