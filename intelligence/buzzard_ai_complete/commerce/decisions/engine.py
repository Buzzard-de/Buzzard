from buzzard_ai_complete.commerce.pricing.engine import PricingEngine
from buzzard_ai_complete.commerce.profitability.engine import ProfitabilityEngine


class CommerceDecisionEngine:
    def __init__(self, minimum_profit=0.50, default_margin=0.07):
        self.profit = ProfitabilityEngine(minimum_profit)
        self.pricing = PricingEngine(default_margin)

    def evaluate(self, product, selling_price, competitor_prices=None):
        r = self.profit.calculate(
            selling_price,
            product["purchase_price"],
            product.get("shipping_cost", 0),
            product.get("marketplace_fee", 0),
            product.get("payment_fee", 0),
            product.get("tax_rate", 0),
            product.get("ad_cost", 0),
            target_margin=product.get("target_margin", 0.07),
        )
        comp = self.pricing.compare(selling_price, competitor_prices or [])
        if not r.viable:
            decision = "REJECT"
        elif comp["position"] == "ABOVE_AVERAGE":
            decision = "TEST"
        else:
            decision = "SELL"
        score = max(0, min(100, 50 + r.net_margin * 100 + (10 if comp["position"] == "BELOW_AVERAGE" else 0)))
        return {
            "decision": decision,
            "score": round(score, 2),
            "net_profit": round(r.net_profit, 2),
            "net_margin": round(r.net_margin, 4),
            "competitive": comp,
        }
