from .base import CouncilAgent

class ForecastAi(CouncilAgent):
    agent_id = "forecast_ai"
    name = "Forecast AI"
    input_topics = "forecast,demand,season,inventory".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("forecast",
    f"Demand forecast request for: {objective}.",
    0.72,
    recommendations=["forecast demand and reorder points using historical data"],
    risks=["forecast_quality_depends_on_history"])
