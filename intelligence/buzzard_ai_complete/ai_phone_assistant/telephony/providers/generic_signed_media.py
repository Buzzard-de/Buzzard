class GenericSignedMediaProvider:
    """Provider-neutral adapter for signed webhooks + bidirectional media streams."""

    name = "generic_signed_media"

    def __init__(self, validator, config=None):
        self.validator = validator
        self.config = config or {}

    def validate_webhook(self, headers, body):
        if not self.validator(headers, body):
            raise ValueError("INVALID_WEBHOOK")
        return True

    def parse_inbound_call(self, headers, body):
        return {
            "provider_call_id": body.get("CallSid") or body.get("call_id"),
            "from_number": body.get("From") or body.get("from"),
            "to_number": body.get("To") or body.get("to"),
        }

    def answer(self, session):
        return {
            "action": "answer",
            "call_id": session.call_id,
            "executed": False,
            "live": False,
            "pstnConnected": False,
            "reason": "CALL_ANSWER_BLOCKED",
        }

    def hangup(self, session):
        return {
            "action": "hangup",
            "call_id": session.call_id,
            "executed": False,
            "live": False,
            "pstn": False,
            "reason": "HANGUP_LOCAL_ONLY",
        }

    def transfer(self, session, destination):
        if not destination:
            raise ValueError("TRANSFER_DESTINATION_REQUIRED")
        return {
            "action": "transfer",
            "call_id": session.call_id,
            "destination": None,
            "transferred": False,
            "live": False,
            "reason": "TRANSFER_BLOCKED",
        }

    def start_media_stream(self, session, callback_url):
        if not callback_url:
            raise ValueError("MEDIA_CALLBACK_REQUIRED")
        return {
            "action": "start_media_stream",
            "call_id": session.call_id,
            "callback_url": None,
            "streamOpened": False,
            "live": False,
            "reason": "MEDIA_STREAM_BLOCKED",
        }

    def stop_media_stream(self, session):
        return {"action": "stop_media_stream", "call_id": session.call_id}
