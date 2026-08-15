from dataclasses import dataclass, field
from typing import Any


@dataclass
class CallSession:
    call_id: str
    language: str = "de"
    state: str = "greeting"
    customer: dict[str, Any] = field(default_factory=dict)
    entities: dict[str, Any] = field(default_factory=dict)
    summary: list[str] = field(default_factory=list)

    def set_language(self, language: str):
        self.language = language
        self.state = "language_confirmed"

    def add_summary(self, text: str):
        self.summary.append(text)

    def snapshot(self):
        return {
            "call_id": self.call_id,
            "language": self.language,
            "state": self.state,
            "customer": self.customer,
            "entities": self.entities,
            "summary": self.summary[-20:],
        }
