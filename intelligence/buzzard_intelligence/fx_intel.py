from .json_store import JsonIntelligenceStore


class FXIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            66,
            "Currency & FX Intelligence",
            "buzzard_v66.json",
            path,
        )
