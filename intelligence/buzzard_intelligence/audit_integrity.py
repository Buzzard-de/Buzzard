from .json_store import JsonIntelligenceStore


class AuditLogIntegrity(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            112,
            "Audit Log Integrity",
            "buzzard_v112.json",
            path,
        )
