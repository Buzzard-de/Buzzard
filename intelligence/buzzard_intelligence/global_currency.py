from .json_store import JsonIntelligenceStore


class GlobalCurrencyIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            96,
            "Global Currency Intelligence",
            "buzzard_v96.json",
            path,
        )
