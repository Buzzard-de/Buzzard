from .json_store import JsonIntelligenceStore


class LeadTimeIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            155,
            "Lead Time Intelligence",
            "buzzard_v155.json",
            path,
        )
