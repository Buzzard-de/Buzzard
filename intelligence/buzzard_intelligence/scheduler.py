import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .collector import Collector
from .seeds import SEED_CATEGORIES

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_intelligence_v4.db"
SEED_DE_PATH = Path(__file__).resolve().parent / "seed_categories_de.json"
SOURCE_NOT_CONFIGURED = "SOURCE_NOT_CONFIGURED"


class Scheduler:
    MIN_INTERVAL_MINUTES = 60

    def __init__(self, collector=None):
        self.collector = collector or Collector()
        self.path = DB_PATH

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def now(self):
        return datetime.now(timezone.utc)

    def init(self):
        self.collector.init()
        with self.connect() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS scan_tasks(
                    id INTEGER PRIMARY KEY,
                    category TEXT NOT NULL,
                    subcategory TEXT,
                    url TEXT NOT NULL,
                    country TEXT,
                    platform TEXT,
                    interval_minutes INTEGER NOT NULL,
                    priority INTEGER NOT NULL DEFAULT 5,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    last_run TEXT,
                    next_run TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    last_error TEXT
                )
                """
            )

    def _seed_placeholder_tasks(self, categories):
        count = 0
        now = self.now().isoformat()
        with self.connect() as con:
            for category in categories:
                exists = con.execute(
                    "SELECT 1 FROM scan_tasks WHERE category=? LIMIT 1",
                    (category,),
                ).fetchone()
                if exists:
                    continue
                con.execute(
                    """
                    INSERT INTO scan_tasks
                    (category,subcategory,url,country,platform,interval_minutes,
                     priority,enabled,next_run,status)
                    VALUES(?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        category,
                        "",
                        SOURCE_NOT_CONFIGURED,
                        "",
                        "public_web",
                        1440,
                        5,
                        0,
                        now,
                        "WAITING_SOURCE",
                    ),
                )
                count += 1
        return count

    def seed_tasks(self):
        return self._seed_placeholder_tasks(SEED_CATEGORIES)

    def seed_tasks_de(self):
        if not SEED_DE_PATH.exists():
            raise FileNotFoundError(f"Missing {SEED_DE_PATH}")
        categories = json.loads(SEED_DE_PATH.read_text(encoding="utf-8"))
        return self._seed_placeholder_tasks(categories)

    def add_task(
        self,
        category,
        subcategory,
        url,
        country,
        platform,
        interval_minutes,
        priority,
    ):
        if interval_minutes < self.MIN_INTERVAL_MINUTES:
            raise ValueError(f"Mindestintervall ist {self.MIN_INTERVAL_MINUTES} Minuten.")
        if url == SOURCE_NOT_CONFIGURED:
            raise ValueError("Bitte eine gültige Quellen-URL angeben.")

        now = self.now()
        next_run = now.isoformat()
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO scan_tasks
                (category,subcategory,url,country,platform,interval_minutes,
                 priority,enabled,next_run,status)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    category,
                    subcategory,
                    url,
                    country,
                    platform,
                    interval_minutes,
                    priority,
                    1,
                    next_run,
                    "PENDING",
                ),
            )
            return f"Aufgabe #{cur.lastrowid} erstellt."

    def list_tasks(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT id,category,subcategory,url,interval_minutes,
                       priority,enabled,last_run,next_run,status,last_error
                FROM scan_tasks
                ORDER BY priority DESC, id
                """
            ).fetchall()

        if not rows:
            return "Noch keine Aufgaben."

        out = ["=== BUZZARD SCAN-AUFGABEN ==="]
        for row in rows:
            error = f" | Fehler: {row['last_error']}" if row["last_error"] else ""
            out.append(
                f"#{row['id']} | {row['category']} | {row['status']} | "
                f"Priorität={row['priority']} | Intervall={row['interval_minutes']} min | "
                f"aktiv={bool(row['enabled'])} | {row['url']}{error}"
            )
        return "\n".join(out)

    def run_due(self):
        now = self.now()
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT * FROM scan_tasks
                WHERE enabled=1 AND next_run<=?
                ORDER BY priority DESC, id
                """,
                (now.isoformat(),),
            ).fetchall()

        if not rows:
            return "Derzeit keine fälligen Aufgaben."

        output = []
        for task in rows:
            if task["url"] == SOURCE_NOT_CONFIGURED:
                continue

            try:
                result = self.collector.collect(
                    task["url"],
                    task["category"],
                    task["subcategory"] or "",
                    task["country"] or "",
                    task["platform"] or "public_web",
                )
                status = "SUCCESS"
                error = ""
                output.append(f"#{task['id']} {status} | {result}")
            except Exception as exc:
                status = "ERROR"
                error = str(exc)
                output.append(f"#{task['id']} {status} | {error}")

            next_run = now + timedelta(minutes=task["interval_minutes"])
            with self.connect() as con:
                con.execute(
                    """
                    UPDATE scan_tasks
                    SET last_run=?, next_run=?, status=?, last_error=?
                    WHERE id=?
                    """,
                    (now.isoformat(), next_run.isoformat(), status, error, task["id"]),
                )

        return "\n".join(output) if output else "Derzeit keine ausführbaren Aufgaben."
