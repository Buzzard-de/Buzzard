from .json_store import JsonIntelligenceStore


class BusinessOperatingSystem(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            191,
            "Business Operating System",
            "buzzard_v191.json",
            path,
        )
