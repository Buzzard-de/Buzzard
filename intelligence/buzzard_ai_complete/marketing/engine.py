from buzzard_ai_complete.marketing.attribution import AttributionEngine
from buzzard_ai_complete.marketing.budget import BudgetEngine
from buzzard_ai_complete.marketing.providers import GoogleAdsProvider, MetaAdsProvider


class MarketingEngine:
    def __init__(self):
        self.budget = BudgetEngine()
        self.attribution = AttributionEngine()
        self.providers = {
            "google_ads": GoogleAdsProvider(),
            "meta_ads": MetaAdsProvider(),
        }

    def provider_status(self):
        return {name: provider.status() for name, provider in self.providers.items()}

    def allocate_budget(self, total, channels, weights=None):
        return self.budget.allocate(total, channels, weights)

    def create_campaign(self, provider, campaign):
        ad_provider = self.providers.get(provider)
        if ad_provider is None:
            return {"status": "UNSUPPORTED_PROVIDER"}
        return ad_provider.create_campaign(campaign)
