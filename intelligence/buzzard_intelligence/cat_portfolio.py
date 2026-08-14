from .json_store import JsonIntelligenceStore


class CategoryPortfolioIntel(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            90,
            "Category Portfolio Intelligence",
            "buzzard_v90.json",
            path,
        )
