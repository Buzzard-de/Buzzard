from buzzard_ai_complete.marketing.compliance import validate_marketing_data
from buzzard_ai_complete.marketing.creatives import CreativeRegistry
from buzzard_ai_complete.marketing.engine import MarketingEngine
from buzzard_ai_complete.marketing.models import Campaign, Performance
from buzzard_ai_complete.marketing.optimization import recommend_action
from buzzard_ai_complete.marketing.performance import evaluate
from buzzard_ai_complete.marketing.segments import choose_audience


class MarketingAdvertisingService:
    def __init__(self, engine=None):
        self.engine = engine or MarketingEngine()

    def demo_flow(self):
        engine = self.engine
        allocation = engine.allocate_budget(
            1000,
            ["google_ads", "meta_ads"],
            {"google_ads": 2, "meta_ads": 1},
        )
        campaign = Campaign("C-DEMO", "Spring Sale", "Google Ads", 500)
        create_result = engine.create_campaign("google_ads", campaign)
        engine.attribution.record("CUST-1", "C-DEMO", "PURCHASE", 400)
        performance = Performance("C-DEMO", 100, 400, 10, 100, 1000)
        creatives = CreativeRegistry()
        creatives.add("CR-1", "Hero Banner", "google_ads", ["banner-300x250.png"])
        return {
            "provider_status": engine.provider_status(),
            "budget_allocation": allocation,
            "campaign_create": create_result,
            "attribution_revenue": engine.attribution.revenue("C-DEMO"),
            "performance": evaluate(performance),
            "optimization": recommend_action(performance.roas),
            "compliance": validate_marketing_data(True, "RETARGETING"),
            "audience": choose_audience("VIP", consent=True),
            "creative": creatives.get("CR-1"),
        }

    def allocate_budget(self, total, channels, weights=None):
        return {"allocation": self.engine.allocate_budget(total, channels, weights)}

    def create_campaign(self, provider, campaign_id, name, channel, budget, objective="SALES"):
        campaign = Campaign(campaign_id, name, channel, budget, objective=objective)
        return self.engine.create_campaign(provider, campaign)
