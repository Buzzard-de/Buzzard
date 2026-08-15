from decimal import Decimal

class FinanceEngine:
    def order_margin(self, revenue, product_cost, shipping_cost=0, fees=0, tax=0):
        r=Decimal(str(revenue)); c=Decimal(str(product_cost))
        s=Decimal(str(shipping_cost)); f=Decimal(str(fees)); t=Decimal(str(tax))
        contribution=r-c-s-f-t
        return {
            "revenue":str(r),
            "costs":str(c+s+f+t),
            "contribution":str(contribution),
            "margin_pct":float((contribution/r*100) if r else 0)
        }

    def kpi(self, orders, revenue, refunds=0):
        return {
            "orders":orders,
            "revenue":float(revenue),
            "refunds":float(refunds),
            "net_revenue":float(revenue)-float(refunds)
        }
