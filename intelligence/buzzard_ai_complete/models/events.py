from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict

@dataclass
class AgentEvent:
    event_type: str
    actor: str
    payload: Dict[str, Any]
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()
