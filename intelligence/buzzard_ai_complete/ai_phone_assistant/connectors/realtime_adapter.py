class RealtimeVoiceAdapter:
    """Provider-neutral realtime audio/model contract."""

    async def open_session(self, language: str):
        raise NotImplementedError

    async def send_audio(self, audio_chunk: bytes):
        raise NotImplementedError

    async def receive_events(self):
        raise NotImplementedError

    async def close_session(self):
        raise NotImplementedError
