from .json_store import JsonIntelligenceStore


class ContentOpportunityEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            176,
            "Content Opportunity Engine",
            "buzzard_v176.json",
            path,
        )
