class OrderNotificationService:
    def __init__(self, sender=None):
        self.sender = sender

    def send_status(self, order, message):
        if self.sender is None:
            return {"status": "NOT_CONFIGURED"}
        return self.sender.send(f"Order {order.order_id}", message)
