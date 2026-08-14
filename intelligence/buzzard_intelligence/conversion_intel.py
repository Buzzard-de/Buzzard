from .json_store import JsonIntelligenceStore


class ConversionIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            166,
            "Conversion Intelligence",
            "buzzard_v166.json",
            path,
        )
