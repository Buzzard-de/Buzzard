from .json_store import JsonIntelligenceStore


class LocalCompetitorRadar(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            187,
            "Local Competitor Radar",
            "buzzard_v187.json",
            path,
        )
