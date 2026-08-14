from .json_store import JsonIntelligenceStore


class IntegrationTests(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            119,
            "End-to-End Integration Tests",
            "buzzard_v119.json",
            path,
        )
