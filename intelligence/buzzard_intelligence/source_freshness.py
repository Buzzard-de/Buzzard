from .json_store import JsonIntelligenceStore


class SourceFreshnessMonitor(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            110,
            "Source Freshness Monitor",
            "buzzard_v110.json",
            path,
        )
