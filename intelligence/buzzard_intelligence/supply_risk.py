from .json_store import JsonIntelligenceStore


class SupplyRiskRadar(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            156,
            "Supply Risk Radar",
            "buzzard_v156.json",
            path,
        )
