class EvidenceStore:
    def __init__(self):
        self.records = []

    def add(self, evidence):
        self.records.append(evidence)
        return evidence.source_id

    def query(self, category_id=None, source_type=None):
        rows = self.records
        if category_id:
            rows = [x for x in rows if getattr(x, "category_id", None) == category_id]
        if source_type:
            rows = [x for x in rows if x.source_type == source_type]
        return rows

class ChangeHistory:
    def __init__(self):
        self.events = []

    def record(self, category_id, event_type, payload):
        self.events.append({
            "category_id": category_id,
            "event_type": event_type,
            "payload": payload
        })

    def recent(self, category_id, limit=100):
        return [x for x in self.events if x["category_id"] == category_id][-limit:]
