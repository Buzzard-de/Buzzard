class PaymentAdapter:
    def create_payment_intent(self, amount):
        raise NotImplementedError

    def confirm(self, payment_id):
        raise NotImplementedError

    def refund(self, payment_id, amount=None):
        raise NotImplementedError
