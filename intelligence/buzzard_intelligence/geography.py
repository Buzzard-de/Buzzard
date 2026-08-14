from .json_store import JsonIntelligenceStore


class GeographyEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            36,
            "Market Geography Intelligence Engine",
            "buzzard_v36.json",
            path,
        )
