class MarketplaceSyndicator:
    def __init__(self, adapters):
        self.adapters = adapters

    def publish(self, product, channels):
        return {
            channel: (
                self.adapters[channel].upsert_product(product)
                if channel in self.adapters
                else {"status": "not_configured"}
            )
            for channel in channels
        }
