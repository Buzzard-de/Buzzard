from .json_store import JsonIntelligenceStore


class InventoryPlanner(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            84,
            "Inventory Planning",
            "buzzard_v84.json",
            path,
        )
