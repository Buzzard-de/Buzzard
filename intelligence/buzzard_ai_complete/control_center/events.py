from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Event:
    name: str
    payload: dict = field(default_factory=dict)
    source: str = "system"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EventBus:
    def __init__(self):
        self.handlers = {}
        self.history = []

    def subscribe(self, event_name, handler):
        self.handlers.setdefault(event_name, []).append(handler)

    def publish(self, event):
        self.history.append(event)
        results = []
        for handler in self.handlers.get(event.name, []):
            results.append(handler(event))
        return results
