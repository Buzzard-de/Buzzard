from .json_store import JsonIntelligenceStore


class HumanApprovalGuardrails(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            116,
            "Human Approval Guardrails",
            "buzzard_v116.json",
            path,
        )
