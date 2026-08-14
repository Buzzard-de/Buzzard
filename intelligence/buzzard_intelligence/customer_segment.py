from .json_store import JsonIntelligenceStore


class CustomerSegmentation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            162,
            "Customer Segmentation",
            "buzzard_v162.json",
            path,
        )
