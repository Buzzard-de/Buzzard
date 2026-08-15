from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class SourceRecord:
    source: str
    url: str
    checked_at: str
    jurisdiction: str
    note: str = ""


class SourceRegistry:
    def __init__(self):
        self.records = []

    def add(self, source, url, jurisdiction, note=""):
        record = SourceRecord(source, url, datetime.now(timezone.utc).isoformat(), jurisdiction, note)
        self.records.append(record)
        return record

    def latest(self, jurisdiction=None):
        rows = [row for row in self.records if jurisdiction is None or row.jurisdiction == jurisdiction]
        return rows[-1] if rows else None
