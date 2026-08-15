class CommerceAnalyticsAdapter:
    MAP = {
        "ORDER_CREATED": "ORDER",
        "PAYMENT_CONFIRMED": "SALE",
        "ORDER_DELIVERED": "DELIVERED",
    }

    def convert(self, events):
        return [
            {
                "event_id": event.event_id,
                "event_type": self.MAP.get(event.name, event.name),
                "timestamp": event.timestamp,
                "value": float(
                    event.payload.get("subtotal", event.payload.get("amount", 0)) or 0
                ),
                "cost": float(event.payload.get("cost", 0) or 0),
                "metadata": event.payload,
            }
            for event in events
        ]
