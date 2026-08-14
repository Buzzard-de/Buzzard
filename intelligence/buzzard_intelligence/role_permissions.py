from .json_store import JsonIntelligenceStore


class RolePermissionManager(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            123,
            "Role & Permission Manager",
            "buzzard_v123.json",
            path,
        )
