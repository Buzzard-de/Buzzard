from .json_store import JsonIntelligenceStore


class ScenarioEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            38,
            "Profitability & Scenario Engine",
            "buzzard_v38.json",
            path,
        )
