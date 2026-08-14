from .json_store import JsonIntelligenceStore


class DistributedDataProcessing(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            131,
            "Distributed Data Processing",
            "buzzard_v131.json",
            path,
        )
