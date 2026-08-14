from .json_store import JsonIntelligenceStore


class InternationalPayments(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            184,
            "International Payments",
            "buzzard_v184.json",
            path,
        )
