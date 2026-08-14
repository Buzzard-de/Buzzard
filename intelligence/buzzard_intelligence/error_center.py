from .json_store import JsonIntelligenceStore


class ProductionErrorCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            120,
            "Production Readiness & Error Center",
            "buzzard_v120.json",
            path,
        )
