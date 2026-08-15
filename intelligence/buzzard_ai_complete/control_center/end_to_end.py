class EndToEndPlan:
    DEFAULT_STEPS = [
        "customer",
        "order",
        "payment",
        "inventory",
        "supplier",
        "fulfillment",
        "logistics",
        "tracking",
        "invoice",
        "crm",
        "marketing",
        "analytics",
        "audit",
    ]

    def plan(self, order_id):
        return {"order_id": order_id, "steps": list(self.DEFAULT_STEPS)}
