from .json_store import JsonIntelligenceStore


class GDPRDataGovernance(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            126,
            "GDPR Data Governance",
            "buzzard_v126.json",
            path,
        )
