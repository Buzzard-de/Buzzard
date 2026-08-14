from .json_store import JsonIntelligenceStore


class DataQualityControl(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            72,
            "Data Quality Control",
            "buzzard_v72.json",
            path,
        )
