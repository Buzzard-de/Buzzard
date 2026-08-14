from .json_store import JsonIntelligenceStore


class DynamicMarginIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            82,
            "Dynamic Margin Intelligence",
            "buzzard_v82.json",
            path,
        )
