from .json_store import JsonIntelligenceStore


class ProcurementIntelligence(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            151,
            "Procurement Intelligence",
            "buzzard_v151.json",
            path,
        )
