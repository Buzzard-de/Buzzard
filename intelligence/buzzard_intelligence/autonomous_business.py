from .json_store import JsonIntelligenceStore


class AutonomousBusinessWorkflow(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            199,
            "Autonomous Business Workflow",
            "buzzard_v199.json",
            path,
        )
