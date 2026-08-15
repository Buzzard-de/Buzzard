class PaymentGateway:
    def __init__(self, provider, idempotency_store):
        self.provider = provider
        self.idempotency = idempotency_store

    def create(self, request, key):
        cached = self.idempotency.get(key)
        if cached:
            return cached
        result = self.provider.create_intent(
            request["amount"],
            request.get("currency", "EUR"),
            request.get("metadata", {}),
        )
        self.idempotency.put(key, result)
        return result

    def webhook(self, headers, body):
        if not self.provider.verify_webhook(headers, body):
            raise PermissionError("INVALID_PAYMENT_WEBHOOK")
        return self.provider.parse_webhook(body)
