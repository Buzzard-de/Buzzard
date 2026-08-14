from .json_store import JsonIntelligenceStore


class CrossBorderIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            64,
            "Cross-Border Market Intelligence",
            "buzzard_v64.json",
            path,
        )
