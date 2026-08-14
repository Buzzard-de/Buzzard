from .json_store import JsonIntelligenceStore


class BundleIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            88,
            "Bundle Intelligence",
            "buzzard_v88.json",
            path,
        )
