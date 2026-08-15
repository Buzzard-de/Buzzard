from .base import CouncilAgent

class DemandAnalystAi(CouncilAgent):
    agent_id = "demand_analyst_ai"
    name = "Demand Analyst AI"
    input_topics = "demand,season,tiktok,youtube,market".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("demand",
    f"Demand assessment for: {objective}; distinguish sustained demand from short-lived attention.",
    0.76,
    recommendations=["combine search, sales, seasonality and social signals"],
    risks=["viral_signals_can_decay_quickly"])
