import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from buzzard_intelligence.verify import DB_PATH, OfficialVerifier

TASK_PRIORITIES = {"CRITICAL", "HIGH", "NORMAL", "LOW"}
TASK_STATUSES = {"QUEUED", "IN_PROGRESS", "WAITING", "COMPLETED", "FAILED", "CANCELLED"}


class AslanSecretary:
    """
    Aslan Bey v1 — Koordinations-/Müsteşar-Katman über Doğu Bey (v29 OfficialVerifier).

    Ändert die bestehende Verifikations-Infrastruktur nicht; ergänzt Aufgaben-,
    Event- und Review-Tabellen in derselben SQLite-DB.
    """

    def __init__(self, path=None):
        self.path = Path(path or DB_PATH)
        self.verifier = OfficialVerifier(path=self.path)

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def init(self):
        self.verifier.init()
        with self.connect() as con:
            con.executescript(
                """
            CREATE TABLE IF NOT EXISTS aslan_tasks(
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                objective TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'NORMAL',
                status TEXT NOT NULL DEFAULT 'QUEUED',
                assigned_agent TEXT NOT NULL DEFAULT 'DoguBey',
                parent_task_id INTEGER,
                result_summary TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS aslan_task_events(
                id INTEGER PRIMARY KEY,
                task_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS aslan_reviews(
                id INTEGER PRIMARY KEY,
                task_id INTEGER NOT NULL,
                review_type TEXT NOT NULL,
                decision TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL
            );
            """
            )

    def _validate_priority(self, priority):
        priority = priority.upper()
        if priority not in TASK_PRIORITIES:
            raise ValueError("Ungültige Priorität: " + ", ".join(sorted(TASK_PRIORITIES)))
        return priority

    def create_task(
        self,
        title,
        objective,
        priority="NORMAL",
        assigned_agent="DoguBey",
        parent_task_id=None,
    ):
        priority = self._validate_priority(priority)
        now = self.now()
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO aslan_tasks
                (title, objective, priority, status, assigned_agent,
                 parent_task_id, created_at, updated_at)
                VALUES (?, ?, ?, 'QUEUED', ?, ?, ?, ?)
                """,
                (title, objective, priority, assigned_agent, parent_task_id, now, now),
            )
            task_id = cur.lastrowid
            con.execute(
                """
                INSERT INTO aslan_task_events
                (task_id, event_type, details, created_at)
                VALUES (?, 'CREATED', ?, ?)
                """,
                (task_id, f"assigned_agent={assigned_agent}", now),
            )
        return task_id

    def update_status(self, task_id, status, details=""):
        status = status.upper()
        if status not in TASK_STATUSES:
            raise ValueError("Ungültiger Status: " + ", ".join(sorted(TASK_STATUSES)))

        now = self.now()
        completed_at = now if status == "COMPLETED" else None

        with self.connect() as con:
            task = con.execute(
                "SELECT id FROM aslan_tasks WHERE id=?",
                (task_id,),
            ).fetchone()
            if not task:
                raise ValueError("Aufgabe nicht gefunden.")

            con.execute(
                """
                UPDATE aslan_tasks
                SET status=?, updated_at=?,
                    completed_at=COALESCE(?, completed_at)
                WHERE id=?
                """,
                (status, now, completed_at, task_id),
            )

            con.execute(
                """
                INSERT INTO aslan_task_events
                (task_id, event_type, details, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (task_id, "STATUS_CHANGED", details, now),
            )

    def record_result(self, task_id, result_summary):
        now = self.now()
        with self.connect() as con:
            task = con.execute(
                "SELECT id FROM aslan_tasks WHERE id=?",
                (task_id,),
            ).fetchone()
            if not task:
                raise ValueError("Aufgabe nicht gefunden.")

            con.execute(
                """
                UPDATE aslan_tasks
                SET result_summary=?, status='COMPLETED',
                    updated_at=?, completed_at=?
                WHERE id=?
                """,
                (result_summary, now, now, task_id),
            )

            con.execute(
                """
                INSERT INTO aslan_task_events
                (task_id, event_type, details, created_at)
                VALUES (?, 'RESULT_RECORDED', ?, ?)
                """,
                (task_id, result_summary, now),
            )

    def review_claim(self, task_id, claim_id, notes=""):
        with self.connect() as con:
            claim = con.execute(
                """
                SELECT id, entity, claim_text, status, verification_score
                FROM claims WHERE id=?
                """,
                (claim_id,),
            ).fetchone()

            if not claim:
                raise ValueError("Claim nicht gefunden.")

            sources = con.execute(
                """
                SELECT source_type, publisher, source_quality, url
                FROM sources
                WHERE claim_id=?
                ORDER BY source_quality DESC
                """,
                (claim_id,),
            ).fetchall()

        source_count = len(sources)
        best_quality = max((row["source_quality"] for row in sources), default=0)

        if claim["status"] == "CONFLICT":
            decision = "ESCALATE"
            review_notes = "Widersprüchliche Quellen; manuelle Prüfung erforderlich."
        elif claim["status"] == "VERIFIED" and best_quality >= 90 and source_count >= 1:
            decision = "ACCEPT"
            review_notes = "Doğu Bey-Verifikation durch starke Primär-/Offizialquelle gestützt."
        elif claim["status"] in {"PENDING", "UNVERIFIED"}:
            decision = "REQUEST_MORE_RESEARCH"
            review_notes = "Verifikation unvollständig; weitere Recherche nötig."
        elif claim["status"] in {"OUTDATED", "REJECTED"}:
            decision = "REJECT_FOR_REPORT"
            review_notes = "Datensatz nicht als aktuell/verifiziert verwendbar."
        else:
            decision = "ESCALATE"
            review_notes = "Manuelle Prüfung erforderlich."

        if notes:
            review_notes += " " + notes

        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT INTO aslan_reviews
                (task_id, review_type, decision, notes, created_at)
                VALUES (?, 'CLAIM_VERIFICATION', ?, ?, ?)
                """,
                (task_id, decision, review_notes, now),
            )

        return {
            "task_id": task_id,
            "claim_id": claim_id,
            "decision": decision,
            "claim_status": claim["status"],
            "verification_score": claim["verification_score"],
            "source_count": source_count,
            "best_source_quality": best_quality,
            "notes": review_notes,
        }

    def dashboard(self):
        with self.connect() as con:
            tasks = con.execute(
                """
                SELECT status, priority, COUNT(*) AS count
                FROM aslan_tasks
                GROUP BY status, priority
                ORDER BY priority, status
                """
            ).fetchall()

            recent = con.execute(
                """
                SELECT id, title, priority, status, assigned_agent, updated_at
                FROM aslan_tasks
                ORDER BY updated_at DESC
                LIMIT 20
                """
            ).fetchall()

        out = ["=== ASLAN BEY v1 — MÜSTEŞAR KONTROLLPANEL ===", "", "ZUSAMMENFASSUNG"]
        if tasks:
            for row in tasks:
                out.append(f"- {row['priority']} | {row['status']} | {row['count']}")
        else:
            out.append("- Noch keine Aufgaben.")

        out += ["", "LETZTE AUFGABEN"]
        for row in recent:
            out.append(
                f"- #{row['id']} {row['title']} | {row['priority']} | "
                f"{row['status']} | {row['assigned_agent']}"
            )
        return "\n".join(out)
