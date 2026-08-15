class PaymentProvider:
    name = "base"

    def create_intent(self, amount, currency, metadata=None):
        raise NotImplementedError

    def confirm(self, intent_id):
        raise NotImplementedError

    def refund(self, payment_id, amount=None):
        raise NotImplementedError

    def verify_webhook(self, headers, body):
        raise NotImplementedError

    def parse_webhook(self, body):
        raise NotImplementedError
