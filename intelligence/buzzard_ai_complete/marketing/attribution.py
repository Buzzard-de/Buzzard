class AttributionEngine:
    def __init__(self):
        self.events = []

    def record(self, customer_id, campaign_id, event, value=0):
        self.events.append(
            {
                "customer_id": customer_id,
                "campaign_id": campaign_id,
                "event": event,
                "value": float(value),
            }
        )

    def revenue(self, campaign_id):
        return round(
            sum(
                e["value"]
                for e in self.events
                if e["campaign_id"] == campaign_id and e["event"] == "PURCHASE"
            ),
            2,
        )
