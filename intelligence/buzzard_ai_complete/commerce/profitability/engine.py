from dataclasses import dataclass


@dataclass(frozen=True)
class ProfitResult:
    revenue: float
    total_cost: float
    net_profit: float
    net_margin: float
    viable: bool


class ProfitabilityEngine:
    def __init__(self, minimum_net_profit=0.50):
        self.minimum_net_profit = minimum_net_profit

    def calculate(
        self,
        selling_price,
        purchase_price,
        shipping_cost=0,
        marketplace_fee=0,
        payment_fee=0,
        tax_rate=0,
        ad_cost=0,
        other_cost=0,
        target_margin=0.07,
    ):
        selling_price = float(selling_price)
        tax = max(0.0, selling_price * float(tax_rate))
        total = (
            max(0.0, float(purchase_price))
            + max(0.0, float(shipping_cost))
            + max(0.0, float(marketplace_fee))
            + max(0.0, float(payment_fee))
            + tax
            + max(0.0, float(ad_cost))
            + max(0.0, float(other_cost))
        )
        profit = selling_price - total
        margin = profit / selling_price if selling_price else -1.0
        viable = profit >= self.minimum_net_profit and margin >= float(target_margin)
        return ProfitResult(selling_price, total, profit, margin, viable)
