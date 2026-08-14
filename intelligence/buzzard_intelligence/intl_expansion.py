from .json_store import JsonIntelligenceStore


class IntlExpansionIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            95,
            "International Expansion Intelligence",
            "buzzard_v95.json",
            path,
        )
