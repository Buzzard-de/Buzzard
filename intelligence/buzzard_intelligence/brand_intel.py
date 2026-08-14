from .json_store import JsonIntelligenceStore


class BrandIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            52,
            "Brand Intelligence",
            "buzzard_v52.json",
            path,
        )
