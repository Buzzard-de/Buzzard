from .base import CouncilAgent

class YoutubeIntelligenceAi(CouncilAgent):
    agent_id = "youtube_intelligence_ai"
    name = "YouTube Intelligence AI"
    input_topics = "youtube,demand,market,product".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("youtube",
    f"YouTube public-trend/content signal assessment for: {objective}.",
    0.68,
    recommendations=["combine video interest with sales and search evidence"],
    risks=["content_views_do_not_equal_sales"])
