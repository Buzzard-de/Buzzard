from .json_store import JsonIntelligenceStore


class UnifiedErrorHandling(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            101,
            "Unified Error Handling",
            "buzzard_v101.json",
            path,
        )
