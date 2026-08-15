from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import json, hashlib

@dataclass
class KnowledgeItem:
    subject: str
    predicate: str
    object: str
    source: str = ""
    confidence: float = 0.0
    observed_at: str = ""

class KnowledgeStore:
    def __init__(self, path="data/knowledge.jsonl"):
        self.path = path

    def add(self, item: KnowledgeItem):
        item.observed_at = item.observed_at or datetime.now(timezone.utc).isoformat()
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")
        return hashlib.sha256(json.dumps(asdict(item), sort_keys=True).encode()).hexdigest()
