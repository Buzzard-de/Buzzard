from buzzard_ai_complete.production.integrations import Integration


class PaymentAdapter:
    def __init__(self, name, required_env):
        self.integration = Integration(name, tuple(required_env))

    def status(self):
        return self.integration.status()

    def create_payment(self, order):
        if self.status()["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED", "provider": self.integration.name}
        return {"status": "READY_FOR_PROVIDER_CALL", "provider": self.integration.name, "order_id": order["order_id"]}

    def refund(self, order_id, amount):
        if self.status()["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED", "provider": self.integration.name}
        return {"status": "READY_FOR_PROVIDER_CALL", "order_id": order_id, "amount": amount}


class GenericPaymentAdapter(PaymentAdapter):
    def __init__(self):
        super().__init__("payment", ("PAYMENT_API_URL", "PAYMENT_API_KEY"))
