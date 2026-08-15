from abc import ABC, abstractmethod
from typing import Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    def complete(self, messages, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError
