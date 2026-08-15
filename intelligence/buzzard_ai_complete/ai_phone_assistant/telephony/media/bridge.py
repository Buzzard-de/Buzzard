class RealtimeAudioBridge:
    def __init__(self, speech_adapter):
        self.speech = speech_adapter

    async def receive(self, frame, session):
        return await self.speech.input_audio(frame.payload, session)

    async def send(self, session):
        async for audio in self.speech.output_audio(session):
            yield audio
