from dataclasses import dataclass


@dataclass
class PriceDecision:
    sale_price: float
    total_cost: float
    net_profit: float
    net_margin: float
    allowed: bool
    reason: str


class PricingGuard:
    def __init__(self, minimum_profit=0.50, target_margin=0.07):
        self.minimum_profit = float(minimum_profit)
        self.target_margin = float(target_margin)

    def evaluate(
        self,
        sale_price,
        product_cost,
        shipping=0,
        marketplace_fee=0,
        payment_fee=0,
        tax=0,
        advertising=0,
    ):
        values = [sale_price, product_cost, shipping, marketplace_fee, payment_fee, tax, advertising]
        if any(float(value) < 0 for value in values):
            raise ValueError("negative_pricing_input")
        total = sum(float(value) for value in values[1:])
        profit = round(float(sale_price) - total, 2)
        margin = round(profit / float(sale_price), 4) if sale_price else 0.0
        allowed = profit >= self.minimum_profit
        reason = "OK" if allowed else "NET_PROFIT_BELOW_MINIMUM"
        return PriceDecision(round(float(sale_price), 2), round(total, 2), profit, margin, allowed, reason)

    def minimum_price(
        self,
        product_cost,
        shipping=0,
        marketplace_fee=0,
        payment_fee=0,
        tax=0,
        advertising=0,
    ):
        return round(
            sum(map(float, [product_cost, shipping, marketplace_fee, payment_fee, tax, advertising]))
            + self.minimum_profit,
            2,
        )
