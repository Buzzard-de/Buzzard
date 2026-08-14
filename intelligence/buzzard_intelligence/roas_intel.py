from .json_store import JsonIntelligenceStore


class ROASIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            83,
            "Advertising ROAS Intelligence",
            "buzzard_v83.json",
            path,
        )
