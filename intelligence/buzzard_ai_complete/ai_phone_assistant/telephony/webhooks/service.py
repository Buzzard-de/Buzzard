class WebhookService:
    def __init__(self, provider, sessions):
        self.provider = provider
        self.sessions = sessions

    def inbound(self, headers, body):
        self.provider.validate_webhook(headers, body)
        return self.provider.parse_inbound_call(headers, body)

    def session(self, call_id):
        return self.sessions.get(call_id)
