from .base import CouncilAgent

class MarketIntelligenceAi(CouncilAgent):
    agent_id = "market_intelligence_ai"
    name = "Market Intelligence AI"
    input_topics = "market,country,season,competition".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("market",
    f"Market intelligence assessment requested for: {objective}.",
    0.78,
    recommendations=["compare market size, demand, competition and entry friction"],
    risks=["market_data_can_change"],
    approval=False)
