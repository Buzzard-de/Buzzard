from decimal import Decimal

class PricingEngine:
    def __init__(self, repository, policy):
        self.repository=repository
        self.policy=policy

    def current(self, product_id):
        p=self.repository.get(product_id)
        if not p or p.get("sale_price") is None:
            return None
        return p["sale_price"]

    def recommend(self, product, market=None):
        cost=Decimal(str(product["cost"]))
        margin=Decimal(str(self.policy.get("target_margin", "0.11")))
        floor=cost/(Decimal("1")-margin)
        proposed=floor
        if market and market.get("median_price") is not None:
            proposed=min(proposed, Decimal(str(market["median_price"])))
        return {
            "product_id":product["product_id"],
            "recommended_price":str(proposed.quantize(Decimal("0.01"))),
            "reason":"cost_margin_and_market",
            "requires_approval":True
        }
