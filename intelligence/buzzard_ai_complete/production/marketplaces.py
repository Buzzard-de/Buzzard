from buzzard_ai_complete.production.integrations import Integration


class MarketplaceAdapter:
    def __init__(self, name, required_env):
        self.integration = Integration(name, tuple(required_env))

    def status(self):
        return self.integration.status()

    def publish(self, product):
        status = self.status()
        if status["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED", "marketplace": self.integration.name}
        return {"status": "READY_FOR_PROVIDER_CALL", "marketplace": self.integration.name, "sku": product.sku}


class EbayAdapter(MarketplaceAdapter):
    def __init__(self):
        super().__init__("ebay", ("EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"))


class AmazonAdapter(MarketplaceAdapter):
    def __init__(self):
        super().__init__(
            "amazon",
            (
                "AMAZON_CLIENT_ID",
                "AMAZON_CLIENT_SECRET",
                "AMAZON_REFRESH_TOKEN",
                "AMAZON_PARTNER_TAG",
            ),
        )
