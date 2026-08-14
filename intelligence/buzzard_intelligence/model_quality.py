from .json_store import JsonIntelligenceStore


class ModelQualityMonitor(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            149,
            "Model Quality Monitor",
            "buzzard_v149.json",
            path,
        )
