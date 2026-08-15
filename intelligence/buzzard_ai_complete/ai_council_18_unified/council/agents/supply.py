from .base import CouncilAgent

class SupplyAi(CouncilAgent):
    agent_id = "supply_ai"
    name = "Supply AI"
    input_topics = "supply,supplier,manufacturer,logistics".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("supply",
    f"Supplier and availability assessment for: {objective}.",
    0.80,
    recommendations=["score price, availability, delivery, quality and returns"],
    risks=["supplier_outages_can_break_fulfillment"],
    approval=True)
