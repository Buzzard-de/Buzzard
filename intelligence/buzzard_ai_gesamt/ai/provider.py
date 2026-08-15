import os
class AIProvider:
    """Optional model adapter. No network call is made unless configured by the deployment."""
    def __init__(self): self.base_url=os.getenv('BUZZARD_LLM_BASE_URL',''); self.api_key=os.getenv('BUZZARD_LLM_API_KEY',''); self.model=os.getenv('BUZZARD_LLM_MODEL','')
    @property
    def configured(self): return bool(self.base_url and self.api_key and self.model)
    def status(self): return {'configured':self.configured,'model':self.model or None,'base_url':self.base_url or None}
