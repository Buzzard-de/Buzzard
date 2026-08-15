class TelephonyGateway:
    def __init__(self, provider, phone_service):
        self.provider = provider
        self.phone_service = phone_service

    def inbound(self, headers, body):
        self.provider.validate_webhook(headers, body)
        inbound = self.provider.parse_inbound_call(headers, body)
        session = self.phone_service.create_session(inbound)
        return self.phone_service.answer(session)

    def transfer(self, session, destination):
        return self.provider.transfer(session, destination)
