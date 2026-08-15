def revenue(events):
    return round(sum(event.value for event in events if event.event_type == "SALE"), 2)


def costs(events):
    return round(sum(event.cost for event in events), 2)


def gross_profit(events):
    return round(revenue(events) - costs(events), 2)


def order_count(events):
    return sum(1 for event in events if event.event_type == "ORDER")


def refund_total(events):
    return round(sum(event.value for event in events if event.event_type == "REFUND"), 2)


def return_rate(events):
    orders = order_count(events)
    returns = sum(1 for event in events if event.event_type == "RETURN")
    return round(returns / orders, 4) if orders else 0.0


def ad_roas(events):
    spend = sum(event.cost for event in events if event.event_type == "AD_SPEND")
    sales = sum(event.value for event in events if event.event_type == "ATTRIBUTED_SALE")
    return round(sales / spend, 2) if spend else 0.0
