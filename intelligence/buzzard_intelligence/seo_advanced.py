from .json_store import JsonIntelligenceStore


class SEOIntelligenceAdvanced(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            174,
            "SEO Intelligence Advanced",
            "buzzard_v174.json",
            path,
        )
