from .json_store import JsonIntelligenceStore


class QueueJobRecovery(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            115,
            "Queue & Job Recovery",
            "buzzard_v115.json",
            path,
        )
