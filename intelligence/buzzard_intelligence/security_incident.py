from .json_store import JsonIntelligenceStore


class SecurityIncidentCenter(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            130,
            "Security Incident Center",
            "buzzard_v130.json",
            path,
        )
