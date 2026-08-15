from .base import CouncilAgent

class CompetitionAi(CouncilAgent):
    agent_id = "competition_ai"
    name = "Competition AI"
    input_topics = "competition,marketplace,market,price".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("competition",
    f"Public-source competition assessment for: {objective}.",
    0.75,
    recommendations=["compare public categories, products, prices and marketplace presence"],
    risks=["competitor_data_must_remain_public_and_lawful"])
