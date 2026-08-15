class CustomerIntelligence:
    def segment(self, orders, last_order_days, total_value):
        if orders==0: return "new_or_unconverted"
        if last_order_days>180: return "at_risk"
        if total_value>=1000: return "high_value"
        if orders>=3: return "repeat"
        return "active"

    def signals(self, events):
        return {
            "abandoned_cart": any(e=="cart_abandoned" for e in events),
            "repeat_buyer": sum(e=="order_completed" for e in events)>=2,
            "support_needed": any(e=="support_request" for e in events)
        }
