from .json_store import JsonIntelligenceStore


class DatabaseScaling(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            132,
            "Database Scaling",
            "buzzard_v132.json",
            path,
        )
