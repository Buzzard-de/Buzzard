from .base import LLMProvider

class MockLLMProvider(LLMProvider):
    def complete(self, messages, **kwargs):
        return {"provider": "mock", "content": "LLM provider not configured.", "usage": {}}
