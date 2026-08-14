from .json_store import JsonIntelligenceStore


class CredentialValidation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            107,
            "Credential & Secret Validation",
            "buzzard_v107.json",
            path,
        )
