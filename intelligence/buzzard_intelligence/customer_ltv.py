from .json_store import JsonIntelligenceStore


class CustomerLifetimeValue(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            163,
            "Customer Lifetime Value",
            "buzzard_v163.json",
            path,
        )
