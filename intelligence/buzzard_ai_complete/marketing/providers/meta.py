import os

from buzzard_ai_complete.marketing.providers.base import AdProvider


class MetaAdsProvider(AdProvider):
    name = "meta_ads"

    def __init__(self):
        self.configured = all(os.getenv(k) for k in ("META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"))

    def status(self):
        return {"provider": self.name, "status": "CONFIGURED" if self.configured else "NOT_CONFIGURED"}

    def create_campaign(self, campaign):
        if not self.configured:
            return {"status": "NOT_CONFIGURED", "provider": self.name}
        return {"status": "READY_FOR_API_CALL", "provider": self.name, "campaign_id": campaign.campaign_id}

    def report(self, campaign_id):
        return {
            "status": "NOT_CONFIGURED" if not self.configured else "READY_FOR_API_CALL",
            "campaign_id": campaign_id,
        }
