class FulfillmentGateway:
    def __init__(self, configured=False):
        self.configured = configured

    def submit(self, order, supplier):
        if not self.configured:
            return {"status": "NOT_CONFIGURED", "supplier": supplier}
        return {"status": "SUBMITTED", "supplier": supplier, "order_id": order.order_id}
