from .json_store import JsonIntelligenceStore


class CampaignIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            172,
            "Campaign Intelligence",
            "buzzard_v172.json",
            path,
        )
