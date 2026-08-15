def segment_customer(lifetime_value, order_count, support_tickets=0):
    if lifetime_value >= 1000 and order_count >= 5:
        return "VIP"
    if lifetime_value >= 300 or order_count >= 3:
        return "LOYAL"
    if support_tickets >= 3:
        return "AT_RISK"
    return "STANDARD"
