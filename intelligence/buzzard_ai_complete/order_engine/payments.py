class PaymentGateway:
    def __init__(self, configured=False):
        self.configured = configured

    def authorize(self, order):
        if not self.configured:
            return {"status": "NOT_CONFIGURED"}
        return {"status": "AUTHORIZED", "order_id": order.order_id}

    def refund(self, order, amount=None):
        if not self.configured:
            return {"status": "NOT_CONFIGURED"}
        return {"status": "REFUNDED", "order_id": order.order_id, "amount": amount}
