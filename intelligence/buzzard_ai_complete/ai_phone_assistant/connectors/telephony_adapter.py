class TelephonyAdapter:
    """Provider-neutral contract for SIP/telephony integration."""

    async def answer_call(self, call_id: str):
        raise NotImplementedError

    async def play_audio(self, call_id: str, audio_bytes: bytes):
        raise NotImplementedError

    async def receive_audio(self, call_id: str):
        raise NotImplementedError

    async def transfer(self, call_id: str, destination: str):
        raise NotImplementedError

    async def hangup(self, call_id: str):
        raise NotImplementedError
