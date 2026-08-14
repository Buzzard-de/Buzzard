from .json_store import JsonIntelligenceStore


class GrowthOpportunityEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            196,
            "Growth Opportunity Engine",
            "buzzard_v196.json",
            path,
        )
