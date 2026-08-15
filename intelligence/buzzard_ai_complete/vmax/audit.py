from datetime import datetime, timezone


class AuditTrail:
    def __init__(self):
        self.events = []

    def record(self, actor, action, target, result="OK", metadata=None):
        event = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "action": action,
            "target": target,
            "result": result,
            "metadata": metadata or {},
        }
        self.events.append(event)
        return event
