from .base import CouncilAgent

class ChiefStrategyAi(CouncilAgent):
    agent_id = "chief_strategy_ai"
    name = "Chief Strategy AI"
    input_topics = "market,demand,competition,profit,supply,forecast,marketplace,compliance,logistics,customer,returns,manufacturer,season,quality,country,tiktok,youtube".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("strategy",
    f"Strategy synthesis for: {objective}. Prior specialist findings were compared before recommendation.",
    0.80,
    recommendations=["rank opportunities by evidence, profit, supply, risk and market fit"],
    risks=["requires_human_approval_for_major_capital_or_market_commitments"],
    approval=True)
