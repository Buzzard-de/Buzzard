from .json_store import JsonIntelligenceStore


class ResourceOptimization(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            138,
            "Resource Optimization",
            "buzzard_v138.json",
            path,
        )
