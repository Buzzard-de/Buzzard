from .base import CouncilAgent

class ComplianceRiskAi(CouncilAgent):
    agent_id = "compliance_risk_ai"
    name = "Compliance Risk AI"
    input_topics = "compliance,marketplace,product,country".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("legal",
    f"Compliance/risk screening requested for: {objective}.",
    0.85,
    recommendations=["verify product, platform, tax and market requirements before publication"],
    risks=["regulatory_review_required_for_uncertain_products"],
    approval=True)
