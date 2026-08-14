from .json_store import JsonIntelligenceStore


class MarketingCommandCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            180,
            "Marketing Command Center",
            "buzzard_v180.json",
            path,
        )
