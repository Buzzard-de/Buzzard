class RealtimeSpeechAdapter:
    async def input_audio(self, payload, session):
        raise NotImplementedError

    async def output_audio(self, session):
        raise NotImplementedError

    async def interrupt(self, session):
        raise NotImplementedError

    async def close(self, session):
        raise NotImplementedError
