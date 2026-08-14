from .json_store import JsonIntelligenceStore


class SalesCommandCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            170,
            "Sales Command Center",
            "buzzard_v170.json",
            path,
        )
