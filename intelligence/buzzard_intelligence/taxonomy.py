from .json_store import JsonIntelligenceStore


class TaxonomyEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            35,
            "Deep Category Taxonomy Engine",
            "buzzard_v35.json",
            path,
        )
