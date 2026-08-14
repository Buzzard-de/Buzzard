from .json_store import JsonIntelligenceStore


class CommandCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            70,
            "Real-Time Intelligence Command Center",
            "buzzard_v70.json",
            path,
        )
