from .base import CouncilAgent

class ProductQualityAi(CouncilAgent):
    agent_id = "product_quality_ai"
    name = "Product Quality AI"
    input_topics = "quality,returns,customer,manufacturer".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("quality",
    f"Product quality assessment for: {objective}.",
    0.80,
    recommendations=["combine verified specifications, return reasons and customer feedback"],
    risks=["review_bias_can_distort_quality_estimates"])
