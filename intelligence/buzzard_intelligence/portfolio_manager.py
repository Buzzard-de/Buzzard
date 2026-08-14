from .json_store import JsonIntelligenceStore


class PortfolioManager(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            69,
            "Portfolio & Category Portfolio Manager",
            "buzzard_v69.json",
            path,
        )
