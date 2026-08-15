import uuid

from buzzard_ai_complete.ai_phone_assistant.telephony.models import TelephonyCallSession


class PhoneTelephonyRuntime:
    def __init__(self, provider, router, sessions):
        self.provider = provider
        self.router = router
        self.sessions = sessions

    def create_session(self, inbound):
        call_id = inbound.get("provider_call_id") or "call_" + uuid.uuid4().hex
        session = TelephonyCallSession(
            call_id,
            self.provider.name,
            inbound.get("from_number"),
            inbound.get("to_number"),
        )
        self.sessions[call_id] = session
        return session

    def answer(self, session):
        return self.router.inbound(session)

    def hangup(self, session):
        session.state = "ended"
        return self.provider.hangup(session)
