from buzzard_ai_complete.logistics.models import CarrierQuote


class ShippingPolicyV2:
    def __init__(self, excluded=None, max_price=None, max_days=None):
        self.excluded = {name.lower() for name in (excluded or [])}
        self.max_price = max_price
        self.max_days = max_days

    def filter_quotes(self, quotes):
        filtered = []
        for quote in quotes:
            if not quote.available or quote.carrier.lower() in self.excluded:
                continue
            if self.max_price is not None and quote.price > self.max_price:
                continue
            if self.max_days is not None and quote.delivery_days > self.max_days:
                continue
            filtered.append(quote)
        return filtered

    def choose(self, quotes, priority="balanced"):
        quotes = self.filter_quotes(quotes)
        if not quotes:
            return None
        if priority == "fastest":
            return min(quotes, key=lambda quote: (quote.delivery_days, quote.price))
        if priority == "cheapest":
            return min(quotes, key=lambda quote: (quote.price, quote.delivery_days))
        return min(quotes, key=lambda quote: (quote.price + 0.75 * quote.delivery_days))
