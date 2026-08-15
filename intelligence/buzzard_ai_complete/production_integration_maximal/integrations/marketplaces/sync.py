class MarketplaceSync:
    def __init__(self, providers, mapping):
        self.providers = providers
        self.mapping = mapping

    def publish(self, product):
        return {channel: provider.publish_product(product) for channel, provider in self.providers.items()}

    def price_stock(self, product):
        results = {}
        for channel, provider in self.providers.items():
            external_id = self.mapping.external_id(channel, product["product_id"])
            results[channel] = provider.update_price_stock(
                external_id,
                product["price"],
                product["stock"],
            )
        return results
