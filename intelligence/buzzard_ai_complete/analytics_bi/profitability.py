def product_profit(sale_price, product_cost, shipping=0, fees=0, advertising=0, tax=0):
    total = float(product_cost) + float(shipping) + float(fees) + float(advertising) + float(tax)
    profit = round(float(sale_price) - total, 2)
    margin = round(profit / float(sale_price), 4) if sale_price else 0.0
    return {
        "revenue": round(float(sale_price), 2),
        "total_cost": round(total, 2),
        "profit": profit,
        "margin": margin,
    }
