from .json_store import JsonIntelligenceStore


class ReviewIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            61,
            "Customer Review Intelligence",
            "buzzard_v61.json",
            path,
        )
