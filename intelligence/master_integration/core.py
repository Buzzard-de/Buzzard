import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = ROOT / "buzzard_master.db"
CONFIG = ROOT / "config/system.json"


def now():
    return datetime.now(timezone.utc).isoformat()


def init():
    with sqlite3.connect(DB) as c:
        c.executescript(
            """
        CREATE TABLE IF NOT EXISTS events(
            id INTEGER PRIMARY KEY,
            event_type TEXT NOT NULL,
            actor TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS gates(
            name TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            details TEXT,
            updated_at TEXT NOT NULL
        );
        """
        )
        gate_names = [
            "architecture",
            "connectors",
            "data_pipeline",
            "memory",
            "agents_council",
            "security",
            "testing",
            "observability",
            "backup_recovery",
            "deployment",
            "business_rules",
            "go_live",
        ]
        for gate in gate_names:
            c.execute(
                """INSERT OR IGNORE INTO gates
                (name,status,details,updated_at) VALUES(?,?,?,?)""",
                (gate, "PENDING", "Not yet verified", now()),
            )


def event(event_type, actor, details=""):
    with sqlite3.connect(DB) as c:
        c.execute(
            """INSERT INTO events
            (event_type,actor,details,created_at) VALUES(?,?,?,?)""",
            (event_type, actor, details, now()),
        )


def set_gate(name, status, details=""):
    with sqlite3.connect(DB) as c:
        c.execute(
            """INSERT OR REPLACE INTO gates
            (name,status,details,updated_at) VALUES(?,?,?,?)""",
            (name, status, details, now()),
        )
    event("GATE_UPDATE", "Master Integration", f"{name}={status}: {details}")


def gates():
    with sqlite3.connect(DB) as c:
        return c.execute("SELECT name,status,details FROM gates ORDER BY name").fetchall()
