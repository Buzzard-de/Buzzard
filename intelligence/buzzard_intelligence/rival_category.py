from .json_store import JsonIntelligenceStore


class RivalCategoryMap(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            47,
            "Competitor Category Mapping",
            "buzzard_v47.json",
            path,
        )
