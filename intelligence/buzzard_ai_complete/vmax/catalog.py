class ProductIntelligence:
    def score(self, cost, sale_price, shipping=0, fees=0, advertising=0):
        revenue = float(sale_price)
        total = float(cost) + float(shipping) + float(fees) + float(advertising)
        profit = round(revenue - total, 2)
        margin = round(profit / revenue, 4) if revenue else 0
        return {"revenue": revenue, "cost": round(total, 2), "profit": profit, "margin": margin}
