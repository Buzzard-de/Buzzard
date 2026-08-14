from .json_store import JsonIntelligenceStore


class ParallelJobEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            134,
            "Parallel Job Engine",
            "buzzard_v134.json",
            path,
        )
