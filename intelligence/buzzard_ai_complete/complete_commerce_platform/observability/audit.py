import datetime
import json
import uuid


class AuditLog:
    def __init__(self, sink):
        self.sink = sink

    def record(self, actor, action, resource, result, metadata=None):
        entry = {
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "actor": actor,
            "action": action,
            "resource": resource,
            "result": result,
            "metadata": metadata or {},
        }
        self.sink.write(json.dumps(entry, ensure_ascii=False))
        return entry
