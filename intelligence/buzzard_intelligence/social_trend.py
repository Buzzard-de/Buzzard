from .json_store import JsonIntelligenceStore


class SocialTrendIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            175,
            "Social Trend Intelligence",
            "buzzard_v175.json",
            path,
        )
