from .json_store import JsonIntelligenceStore


class ConflictResolution(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            109,
            "Duplicate & Conflict Resolution",
            "buzzard_v109.json",
            path,
        )
