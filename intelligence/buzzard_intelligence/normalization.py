from .json_store import JsonIntelligenceStore


class NormalizationEngine(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            43,
            "Data Normalization & Deduplication",
            "buzzard_v43.json",
            path,
        )
