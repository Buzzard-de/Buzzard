from .json_store import JsonIntelligenceStore


class QueueScaling(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            135,
            "Queue Scaling",
            "buzzard_v135.json",
            path,
        )
