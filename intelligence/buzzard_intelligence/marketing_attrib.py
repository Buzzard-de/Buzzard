from .json_store import JsonIntelligenceStore


class MarketingAttribution(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            171,
            "Marketing Attribution",
            "buzzard_v171.json",
            path,
        )
