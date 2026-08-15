from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


@dataclass
class CommerceEvent:
    name: str
    payload: dict = field(default_factory=dict)
    event_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "shop"


class CommerceEventStore:
    def __init__(self):
        self.events = []

    def append(self, event):
        self.events.append(event)
        return event

    def by_name(self, name):
        return [event for event in self.events if event.name == name]

    def snapshot(self):
        return [event.__dict__.copy() for event in self.events]
