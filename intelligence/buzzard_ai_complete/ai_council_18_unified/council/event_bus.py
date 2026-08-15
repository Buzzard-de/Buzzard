class CouncilEventBus:
    def __init__(self):
        self.handlers = {}

    def subscribe(self, event_name, handler):
        self.handlers.setdefault(event_name, []).append(handler)

    def publish(self, event_name, payload):
        for handler in self.handlers.get(event_name, []):
            handler(payload)

class MemoryBridge:
    def __init__(self, memory):
        self.memory = memory

    def on_finding(self, finding):
        self.memory.add_finding(finding)
