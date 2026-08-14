from .json_store import JsonIntelligenceStore


class AuthorizedResearch(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            41,
            "Authorized Web Research",
            "buzzard_v41.json",
            path,
        )
