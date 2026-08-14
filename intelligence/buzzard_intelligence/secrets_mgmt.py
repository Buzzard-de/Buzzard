from .json_store import JsonIntelligenceStore


class SecretsKeyManagement(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            124,
            "Secrets & Key Management",
            "buzzard_v124.json",
            path,
        )
