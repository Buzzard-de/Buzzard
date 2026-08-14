from .json_store import JsonIntelligenceStore


class InputValidation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            102,
            "Input Validation",
            "buzzard_v102.json",
            path,
        )
