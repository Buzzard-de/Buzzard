from .json_store import JsonIntelligenceStore


class PublicConnectors(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            42,
            "Public API Data Connectors",
            "buzzard_v42.json",
            path,
        )
