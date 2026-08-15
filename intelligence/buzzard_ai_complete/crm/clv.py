def calculate_clv(total_revenue, total_orders, average_margin=0.0):
    revenue = float(total_revenue)
    orders = int(total_orders)
    if revenue < 0 or orders < 0:
        raise ValueError("invalid_customer_values")
    return round(revenue * float(average_margin), 2) if average_margin else round(revenue, 2)
