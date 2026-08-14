from .json_store import JsonIntelligenceStore


class SourceReliability(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            44,
            "Source Reliability Scoring",
            "buzzard_v44.json",
            path,
        )
