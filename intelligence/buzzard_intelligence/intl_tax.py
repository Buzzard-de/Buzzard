from .json_store import JsonIntelligenceStore


class InternationalTaxIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            182,
            "International Tax Intelligence",
            "buzzard_v182.json",
            path,
        )
