from .json_store import JsonIntelligenceStore


class BackupRestoreManager(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            117,
            "Backup & Restore Manager",
            "buzzard_v117.json",
            path,
        )
