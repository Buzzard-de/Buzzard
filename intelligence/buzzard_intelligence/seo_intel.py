from .json_store import JsonIntelligenceStore


class SEOIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            59,
            "SEO & Search Demand Intelligence",
            "buzzard_v59.json",
            path,
        )
