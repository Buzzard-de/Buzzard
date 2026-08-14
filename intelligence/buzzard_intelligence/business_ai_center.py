from .json_store import JsonIntelligenceStore


class BusinessAICenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            200,
            "Buzzard AI Business Operating Intelligence Center",
            "buzzard_v200.json",
            path,
        )
