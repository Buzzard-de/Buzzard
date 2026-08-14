from .json_store import JsonIntelligenceStore


class OpportunityDiscovery(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            50,
            "Opportunity Discovery",
            "buzzard_v50.json",
            path,
        )
