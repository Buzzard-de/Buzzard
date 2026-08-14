import json
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent


class JsonIntelligenceStore:
    def __init__(self, version, title, db_name, path=None):
        self.version = version
        self.title = title
        self.path = Path(path or INTELLIGENCE_DIR / db_name)

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def load(self):
        if self.path.exists():
            return json.loads(self.path.read_text(encoding="utf-8"))
        return {
            "version": self.version,
            "title": self.title,
            "created_at": self.now(),
            "records": [],
            "events": [],
        }

    def save(self, data):
        self.path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def init(self):
        data = self.load()
        data.setdefault("version", self.version)
        data.setdefault("title", self.title)
        data.setdefault("records", [])
        data.setdefault("events", [])
        self.save(data)

    def demo(self):
        data = self.load()
        data["records"].append(
            {
                "type": "DEMO",
                "title": self.title,
                "status": "ACTIVE",
                "created_at": self.now(),
            }
        )
        data["events"].append({"event": "DEMO_CREATED", "created_at": self.now()})
        self.save(data)

    def report(self):
        data = self.load()
        out = [
            f"=== BUZZARD v{self.version} — {self.title.upper()} ===",
            f"Einträge: {len(data.get('records', []))}",
            f"Audit-Ereignisse: {len(data.get('events', []))}",
            "",
            "REGELN:",
            "Quellenverknüpft, zeitgestempelt und auditierbar.",
            "Keine stillschweigende Überschreibung historischer Intelligence.",
            "Irreversible Handelsentscheidungen erfordern Menschen-Freigabe.",
        ]
        for record in data.get("records", [])[:20]:
            out.append(f"- {record}")
        return "\n".join(out)
