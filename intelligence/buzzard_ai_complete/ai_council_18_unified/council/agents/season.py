from .base import CouncilAgent

class SeasonAi(CouncilAgent):
    agent_id = "season_ai"
    name = "Season AI"
    input_topics = "season,demand,market,forecast".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("season",
    f"Seasonality assessment for: {objective}.",
    0.74,
    recommendations=["adjust demand expectations and purchasing around seasonal cycles"],
    risks=["regional_seasonality_differs"])
