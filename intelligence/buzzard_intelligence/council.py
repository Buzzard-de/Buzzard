import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_council_v10.db"
DEFAULT_AGENT = "Buzzard Intelligence"

SEVERITY_TO_PRIORITY = {
    "CRITICAL": 10,
    "HIGH": 8,
    "MEDIUM": 5,
    "LOW": 3,
}


class Council:
    def __init__(self, path=None):
        self.path = Path(path or DB_PATH)

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def init(self):
        with self.connect() as con:
            con.executescript(
                """
                CREATE TABLE IF NOT EXISTS events(
                    id INTEGER PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    details TEXT,
                    source TEXT,
                    source_ref TEXT,
                    priority INTEGER NOT NULL,
                    from_agent TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'NEW',
                    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                    assigned_to TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(source_ref)
                );

                CREATE TABLE IF NOT EXISTS reviews(
                    id INTEGER PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    agent TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS audit_log(
                    id INTEGER PRIMARY KEY,
                    event_id INTEGER,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def create_event(
        self,
        event_type,
        title,
        details,
        source,
        priority,
        from_agent=DEFAULT_AGENT,
        source_ref=None,
        verification_status="UNVERIFIED",
    ):
        now = self.now()
        with self.connect() as con:
            if source_ref:
                existing = con.execute(
                    "SELECT id FROM events WHERE source_ref=?",
                    (source_ref,),
                ).fetchone()
                if existing:
                    return f"Intelligence-Ereignis #{existing['id']} bereits in der Warteschlange."

            cur = con.execute(
                """
                INSERT INTO events
                (event_type,title,details,source,source_ref,priority,from_agent,
                 status,verification_status,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    event_type,
                    title,
                    details,
                    source,
                    source_ref,
                    max(1, min(10, priority)),
                    from_agent,
                    "NEW",
                    verification_status,
                    now,
                    now,
                ),
            )
            event_id = cur.lastrowid
            con.execute(
                """
                INSERT INTO audit_log(event_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (event_id, "CREATED", from_agent, title, now),
            )
        return f"Intelligence-Ereignis #{event_id} an den Review-Workflow übergeben."

    def assign(self, event_id, agent, actor="Council Manager"):
        now = self.now()
        with self.connect() as con:
            row = con.execute("SELECT id FROM events WHERE id=?", (event_id,)).fetchone()
            if not row:
                return "Ereignis nicht gefunden."
            con.execute(
                """
                UPDATE events SET assigned_to=?,status='ASSIGNED',updated_at=?
                WHERE id=?
                """,
                (agent, now, event_id),
            )
            con.execute(
                """
                INSERT INTO audit_log(event_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (event_id, "ASSIGNED", actor, agent, now),
            )
        return f"#{event_id} -> {agent} zugewiesen."

    def review(self, event_id, decision, note, agent):
        now = self.now()
        with self.connect() as con:
            row = con.execute("SELECT id FROM events WHERE id=?", (event_id,)).fetchone()
            if not row:
                return "Ereignis nicht gefunden."
            con.execute(
                """
                INSERT INTO reviews(event_id,agent,decision,note,created_at)
                VALUES(?,?,?,?,?)
                """,
                (event_id, agent, decision, note, now),
            )
            con.execute(
                "UPDATE events SET status='REVIEWED',updated_at=? WHERE id=?",
                (now, event_id),
            )
            con.execute(
                """
                INSERT INTO audit_log(event_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (event_id, "REVIEWED", agent, decision, now),
            )
        return f"#{event_id} Bewertung gespeichert."

    def inbox(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT id,event_type,title,details,source,priority,
                       from_agent,status,verification_status,assigned_to,created_at
                FROM events
                WHERE status!='REVIEWED'
                ORDER BY priority DESC, created_at DESC
                """
            ).fetchall()

        if not rows:
            return "Review-Posteingang ist leer."

        out = ["=== BUZZARD INTELLIGENCE — REVIEW-POSTEINGANG ==="]
        for row in rows:
            out.append(
                f"#{row['id']} [{row['priority']}/10] {row['event_type']} | "
                f"{row['title']} | Status={row['status']} | "
                f"Verifizierung={row['verification_status']} | "
                f"Zuständig={row['assigned_to'] or '-'} | Quelle={row['source'] or '-'}"
            )
        return "\n".join(out)

    def council_board(self):
        with self.connect() as con:
            stats = con.execute(
                "SELECT status,COUNT(*) n FROM events GROUP BY status"
            ).fetchall()
            reviews = con.execute(
                """
                SELECT event_id,agent,decision,note,created_at
                FROM reviews ORDER BY created_at DESC LIMIT 20
                """
            ).fetchall()
            audit = con.execute(
                """
                SELECT event_id,action,actor,details,created_at
                FROM audit_log ORDER BY created_at DESC LIMIT 10
                """
            ).fetchall()

        out = ["=== BUZZARD INTELLIGENCE — REVIEW-BOARD ===", "", "EREIGNIS-STATUS"]
        if stats:
            for row in stats:
                out.append(f"- {row['status']}: {row['n']}")
        else:
            out.append("- Keine Ereignisse.")

        out += ["", "LETZTE BEWERTUNGEN"]
        if reviews:
            for row in reviews:
                out.append(
                    f"- Ereignis #{row['event_id']} | {row['agent']} | "
                    f"{row['decision']} | {row['note'] or '-'}"
                )
        else:
            out.append("- Noch keine Bewertungen.")

        out += ["", "AUDIT-TRAIL (letzte 10)"]
        for row in audit:
            out.append(
                f"- #{row['event_id'] or '-'} | {row['action']} | "
                f"{row['actor']} | {row['details'] or '-'} | {row['created_at']}"
            )

        out += [
            "",
            "ZUSTÄNDIGKEITEN:",
            "Intelligence = Daten, Quellen und Signale.",
            "Review-Workflow = Bewertung und Empfehlung.",
            "Finale Geschäftsentscheidung = autorisierte Person.",
        ]
        return "\n".join(out)

    def sync_from_alerts(self, reporter):
        reporter.init()
        self.init()
        imported = 0
        with sqlite3.connect(reporter.path) as con:
            con.row_factory = sqlite3.Row
            alerts = con.execute(
                """
                SELECT id, alert_type, severity, title, details, entity, created_at
                FROM alerts WHERE acknowledged=0
                ORDER BY created_at DESC
                """
            ).fetchall()

        for alert in alerts:
            source_ref = f"alert:{alert['id']}"
            priority = SEVERITY_TO_PRIORITY.get(alert["severity"], 5)
            result = self.create_event(
                alert["alert_type"],
                alert["title"],
                f"{alert['details'] or ''} | Entität: {alert['entity'] or '-'}",
                alert["entity"] or "",
                priority,
                DEFAULT_AGENT,
                source_ref=source_ref,
            )
            if result.startswith("Intelligence-Ereignis #") and "bereits" not in result:
                imported += 1
        return imported

    def demo(self):
        self.create_event(
            "CATEGORY_DISCOVERY",
            "Neues Kategorie-Signal",
            "Beispiel-Unterkategorie in öffentlicher Quelle entdeckt.",
            "https://example.com",
            8,
        )
        self.create_event(
            "TREND",
            "Steigendes Produktsignal",
            "Veröffentlichtes Popularitätssignal für ein Produkt steigt.",
            "https://example.com",
            7,
        )
