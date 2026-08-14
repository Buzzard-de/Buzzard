from .json_store import JsonIntelligenceStore


class ContinuousLearningPipeline(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            148,
            "Continuous Learning Pipeline",
            "buzzard_v148.json",
            path,
        )
