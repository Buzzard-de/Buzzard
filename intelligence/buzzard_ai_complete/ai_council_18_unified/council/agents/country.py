from .base import CouncilAgent

class CountryOpportunityAi(CouncilAgent):
    agent_id = "country_opportunity_ai"
    name = "Country Opportunity AI"
    input_topics = "country,market,logistics,compliance,profit,language".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("country",
    f"Country opportunity assessment for: {objective}.",
    0.77,
    recommendations=["compare demand, competition, logistics, tax, language and compliance"],
    risks=["country_rules_require_current_verification"])
