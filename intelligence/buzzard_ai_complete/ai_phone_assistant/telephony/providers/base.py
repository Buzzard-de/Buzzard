class TelephonyProvider:
    name = "base"

    def validate_webhook(self, headers, body):
        raise NotImplementedError

    def parse_inbound_call(self, headers, body):
        raise NotImplementedError

    def answer(self, session):
        raise NotImplementedError

    def hangup(self, session):
        raise NotImplementedError

    def transfer(self, session, destination):
        raise NotImplementedError

    def start_media_stream(self, session, callback_url):
        raise NotImplementedError

    def stop_media_stream(self, session):
        raise NotImplementedError
