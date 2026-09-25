from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class IntegrationAdapter(ABC):
    integration_id: str

    @abstractmethod
    def status(self) -> str:
        """CONNECTED | EXTERNAL_INTEGRATION_PENDING | ERROR"""

    @abstractmethod
    def connect(self) -> dict[str, Any]:
        raise NotImplementedError
