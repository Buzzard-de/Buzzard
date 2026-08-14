from .json_store import JsonIntelligenceStore


class MasterCore(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            40,
            "Master Intelligence Core",
            "buzzard_v40.json",
            path,
        )
