from .base import CouncilAgent

class ReturnsAi(CouncilAgent):
    agent_id = "returns_ai"
    name = "Returns AI"
    input_topics = "returns,customer,quality,supply,profit".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("returns",
    f"Returns/RMA assessment for: {objective}.",
    0.79,
    recommendations=["identify root causes by SKU, supplier, reason and cost"],
    risks=["return_reason_coding_must_be_consistent"])
