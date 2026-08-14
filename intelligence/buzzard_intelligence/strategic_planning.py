from .json_store import JsonIntelligenceStore


class StrategicPlanningAI(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            193,
            "Strategic Planning AI",
            "buzzard_v193.json",
            path,
        )
