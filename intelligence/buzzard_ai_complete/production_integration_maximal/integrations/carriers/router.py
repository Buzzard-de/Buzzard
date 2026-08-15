class CarrierRouter:
    def __init__(self, providers):
        self.providers = providers

    def quotes(self, shipment):
        results = []
        for name, provider in self.providers.items():
            quote = provider.quote(shipment)
            if quote:
                results.append({"carrier": name, **quote})
        return sorted(results, key=lambda item: item.get("price", 10**9))

    def create_label(self, carrier, shipment):
        if carrier not in self.providers:
            raise ValueError("CARRIER_NOT_CONFIGURED")
        return self.providers[carrier].create_label(shipment)
