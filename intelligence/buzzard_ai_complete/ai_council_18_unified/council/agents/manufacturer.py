from .base import CouncilAgent

class ManufacturerProductAi(CouncilAgent):
    agent_id = "manufacturer_product_ai"
    name = "Manufacturer/Product Intelligence AI"
    input_topics = "manufacturer,product,quality,supply".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("manufacturer",
    f"Manufacturer/product intelligence assessment for: {objective}.",
    0.76,
    recommendations=["compare manufacturer reliability, product continuity and quality signals"],
    risks=["manufacturer_claims_require_source_verification"])
