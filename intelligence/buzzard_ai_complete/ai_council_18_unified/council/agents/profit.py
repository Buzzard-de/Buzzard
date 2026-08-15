from .base import CouncilAgent

class ProfitAi(CouncilAgent):
    agent_id = "profit_ai"
    name = "Profit AI"
    input_topics = "profit,pricing,logistics,returns,marketplace,supply".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("profit",
    f"Unit-economics assessment for: {objective}; include product, shipping, fees, ads and returns.",
    0.82,
    recommendations=["calculate contribution margin before scaling"],
    risks=["incomplete_cost_data_can_overstate_profit"],
    approval=True)
