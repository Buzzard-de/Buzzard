from .json_store import JsonIntelligenceStore


class WorkflowAutomation(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            80,
            "Intelligence Workflow Automation",
            "buzzard_v80.json",
            path,
        )
