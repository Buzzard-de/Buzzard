from .json_store import JsonIntelligenceStore


class PrivacyDataMinimization(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            125,
            "Privacy & Data Minimization",
            "buzzard_v125.json",
            path,
        )
