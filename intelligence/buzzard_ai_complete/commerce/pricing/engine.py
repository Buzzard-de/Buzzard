class PricingEngine:
    def __init__(self, minimum_margin=0.07):
        self.minimum_margin = minimum_margin

    def recommended_price(self, cost, target_margin=None):
        margin = self.minimum_margin if target_margin is None else float(target_margin)
        if margin >= 1:
            raise ValueError("target margin must be below 1")
        return round(float(cost) / (1 - margin), 2)

    def compare(self, selling_price, competitor_prices):
        prices = [float(x) for x in competitor_prices if float(x) > 0]
        if not prices:
            return {"position": "UNKNOWN", "competitor_average": None, "delta": None}
        avg = sum(prices) / len(prices)
        delta = float(selling_price) - avg
        position = (
            "BELOW_AVERAGE"
            if delta < 0
            else "ABOVE_AVERAGE"
            if delta > 0
            else "AT_AVERAGE"
        )
        return {
            "position": position,
            "competitor_average": round(avg, 2),
            "delta": round(delta, 2),
        }
