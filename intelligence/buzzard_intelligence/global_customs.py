from .json_store import JsonIntelligenceStore


class GlobalCustomsIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            97,
            "Global Customs Intelligence",
            "buzzard_v97.json",
            path,
        )
