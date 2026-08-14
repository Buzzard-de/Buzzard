from .json_store import JsonIntelligenceStore


class ResearchJobsEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            71,
            "Automated Research Jobs",
            "buzzard_v71.json",
            path,
        )
