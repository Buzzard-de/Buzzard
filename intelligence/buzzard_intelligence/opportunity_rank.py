from .json_store import JsonIntelligenceStore


class OpportunityRanking(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            76,
            "Opportunity Ranking",
            "buzzard_v76.json",
            path,
        )
