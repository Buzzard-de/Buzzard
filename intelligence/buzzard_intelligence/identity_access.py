from .json_store import JsonIntelligenceStore


class IdentityAccessControl(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            122,
            "Identity & Access Control",
            "buzzard_v122.json",
            path,
        )
