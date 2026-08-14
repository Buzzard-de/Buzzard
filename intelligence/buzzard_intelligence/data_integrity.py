from .json_store import JsonIntelligenceStore


class DataIntegrityChecks(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            108,
            "Data Integrity Checks",
            "buzzard_v108.json",
            path,
        )
