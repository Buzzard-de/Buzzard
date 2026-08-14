from .json_store import JsonIntelligenceStore


class LeadIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            165,
            "Lead Intelligence",
            "buzzard_v165.json",
            path,
        )
