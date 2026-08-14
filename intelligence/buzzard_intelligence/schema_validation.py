from .json_store import JsonIntelligenceStore


class SchemaValidation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            103,
            "Schema Validation",
            "buzzard_v103.json",
            path,
        )
