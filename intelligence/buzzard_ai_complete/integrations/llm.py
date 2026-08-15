class LLMProvider:
    def __init__(self,api_key='',model=''): self.api_key=api_key; self.model=model
    def generate(self,prompt): raise NotImplementedError('Configure a concrete LLM provider adapter.')
