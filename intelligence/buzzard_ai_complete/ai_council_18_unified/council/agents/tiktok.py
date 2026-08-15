from .base import CouncilAgent

class TiktokIntelligenceAi(CouncilAgent):
    agent_id = "tiktok_intelligence_ai"
    name = "TikTok Intelligence AI"
    input_topics = "tiktok,demand,market,season".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("tiktok",
    f"TikTok public-trend signal assessment for: {objective}.",
    0.68,
    recommendations=["use social signals as supporting evidence, not sole proof"],
    risks=["viral_content_is_noisy"])
