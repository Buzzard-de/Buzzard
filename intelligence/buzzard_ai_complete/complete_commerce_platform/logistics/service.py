class LogisticsService:
    def __init__(self, carriers):
        self.carriers = carriers

    def quote(self, shipment):
        quotes = []
        for name, adapter in self.carriers.items():
            quote = adapter.quote(shipment)
            if quote:
                quotes.append({"carrier": name, **quote})
        return sorted(quotes, key=lambda item: item.get("price", 10**9))

    def buy_label(self, carrier, shipment):
        return self.carriers[carrier].buy_label(shipment)
