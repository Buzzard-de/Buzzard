TRANSITIONS = {
    "pending_payment": {"paid", "cancelled"},
    "paid": {"processing", "cancelled", "refunded"},
    "processing": {"fulfilled", "on_hold", "cancelled"},
    "fulfilled": {"shipped"},
    "shipped": {"delivered", "on_hold"},
    "delivered": {"refunded", "partially_refunded"},
    "on_hold": {"processing", "cancelled"},
}


class OrderService:
    def __init__(self, repo):
        self.repo = repo

    def transition(self, order_id, status):
        order = self.repo.get(order_id)
        if not order:
            raise ValueError("ORDER_NOT_FOUND")
        if status not in TRANSITIONS.get(order["status"], set()):
            raise ValueError("INVALID_ORDER_TRANSITION")
        order["status"] = status
        self.repo.save(order_id, order)
        return order
