from dataclasses import dataclass, field
from typing import Any


@dataclass
class TelephonyCallSession:
    call_id: str
    provider: str
    from_number: str | None = None
    to_number: str | None = None
    language: str = "de"
    customer_id: str | None = None
    verification_level: str = "none"
    state: str = "ringing"
    metadata: dict[str, Any] = field(default_factory=dict)
