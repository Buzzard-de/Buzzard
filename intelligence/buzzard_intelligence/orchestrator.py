import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_council_v20.db"

STATUSES = frozenset(
    {"NEW", "ASSIGNED", "IN_PROGRESS", "WAITING", "REVIEW", "COMPLETED", "BLOCKED"}
)

DEFAULT_AGENTS = [
    ("Market Intelligence", "Markt- und Länderforschung"),
    ("Category Intelligence", "Kategorie- und Produktentdeckung"),
    ("Competitor Intelligence", "Wettbewerbs-Intelligence aus offenen Quellen"),
    ("Supplier Intelligence", "Lieferanten- und Integrationsforschung"),
    ("Authenticity & Trust", "Authentizität und Vertrauen"),
    ("Profitability", "Rentabilitätsanalyse"),
    ("Risk & Compliance", "Risiko- und Compliance-Prüfung"),
    ("Council Manager", "Council-Orchestrierung"),
]


class CouncilOrchestrator:
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
                CREATE TABLE IF NOT EXISTS agents(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    role TEXT,
                    active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tasks(
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    details TEXT,
                    priority INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    assigned_to TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS task_dependencies(
                    id INTEGER PRIMARY KEY,
                    task_id INTEGER NOT NULL,
                    depends_on_task_id INTEGER NOT NULL,
                    UNIQUE(task_id, depends_on_task_id)
                );

                CREATE TABLE IF NOT EXISTS opinions(
                    id INTEGER PRIMARY KEY,
                    task_id INTEGER NOT NULL,
                    agent TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS evidence(
                    id INTEGER PRIMARY KEY,
                    task_id INTEGER NOT NULL,
                    agent TEXT NOT NULL,
                    source TEXT NOT NULL,
                    claim TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS orchestration_log(
                    id INTEGER PRIMARY KEY,
                    task_id INTEGER,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

            now = self.now()
            for name, role in DEFAULT_AGENTS:
                con.execute(
                    """
                    INSERT OR IGNORE INTO agents
                    (name,role,created_at)
                    VALUES(?,?,?)
                    """,
                    (name, role, now),
                )

    def create_task(self, title, details="", priority=5, created_by="Council Manager"):
        priority = max(1, min(10, priority))
        now = self.now()

        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO tasks
                (title,details,priority,status,created_by,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (title, details, priority, "NEW", created_by, now, now),
            )
            task_id = cur.lastrowid

            con.execute(
                """
                INSERT INTO orchestration_log
                (task_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (task_id, "CREATED", created_by, title, now),
            )

        return f"Council-Aufgabe #{task_id} erstellt."

    def assign(self, task_id, agent):
        now = self.now()

        with self.connect() as con:
            agent_row = con.execute(
                "SELECT id FROM agents WHERE name=? AND active=1",
                (agent,),
            ).fetchone()
            if not agent_row:
                return "Aktiver Experte nicht gefunden."

            task = con.execute("SELECT id FROM tasks WHERE id=?", (task_id,)).fetchone()
            if not task:
                return "Aufgabe nicht gefunden."

            con.execute(
                """
                UPDATE tasks
                SET assigned_to=?,status='ASSIGNED',updated_at=?
                WHERE id=?
                """,
                (agent, now, task_id),
            )
            con.execute(
                """
                INSERT INTO orchestration_log
                (task_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (task_id, "ASSIGNED", "Council Manager", agent, now),
            )

        return f"Aufgabe #{task_id} -> {agent}"

    def add_opinion(self, task_id, agent, decision, confidence=0.8, note=""):
        confidence = max(0.0, min(1.0, confidence))
        now = self.now()

        with self.connect() as con:
            task = con.execute("SELECT id FROM tasks WHERE id=?", (task_id,)).fetchone()
            if not task:
                return "Aufgabe nicht gefunden."

            con.execute(
                """
                INSERT INTO opinions
                (task_id,agent,decision,confidence,note,created_at)
                VALUES(?,?,?,?,?,?)
                """,
                (task_id, agent, decision, confidence, note, now),
            )
            con.execute(
                "UPDATE tasks SET status='REVIEW',updated_at=? WHERE id=?",
                (now, task_id),
            )
            con.execute(
                """
                INSERT INTO orchestration_log
                (task_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (task_id, "OPINION_ADDED", agent, decision, now),
            )

        return f"Meinung von {agent} für Aufgabe #{task_id} gespeichert."

    def demo(self):
        message = self.create_task(
            "5W-30 Motoröl Marktbewertung",
            "Nachfrage, Wettbewerb, Lieferant, Rentabilität und Risiko gemeinsam prüfen.",
            9,
        )
        task_id = int(message.split("#")[1].split()[0])

        for agent in [
            "Market Intelligence",
            "Competitor Intelligence",
            "Supplier Intelligence",
            "Profitability",
            "Risk & Compliance",
        ]:
            self.assign(task_id, agent)

        self.add_opinion(
            task_id,
            "Market Intelligence",
            "POSITIVE",
            0.82,
            "Marktnachfrage-Signal positiv.",
        )
        self.add_opinion(
            task_id,
            "Risk & Compliance",
            "REVIEW",
            0.91,
            "Produkt- und Dokumentenkonformität separat verifizieren.",
        )

    def board(self):
        with self.connect() as con:
            tasks = con.execute(
                """
                SELECT id,title,priority,status,assigned_to,
                       created_by,created_at,updated_at
                FROM tasks
                ORDER BY
                    CASE status
                      WHEN 'BLOCKED' THEN 1
                      WHEN 'REVIEW' THEN 2
                      WHEN 'IN_PROGRESS' THEN 3
                      WHEN 'ASSIGNED' THEN 4
                      ELSE 5
                    END,
                    priority DESC,created_at DESC
                """
            ).fetchall()

            opinions = con.execute(
                """
                SELECT task_id,agent,decision,confidence,note,created_at
                FROM opinions
                ORDER BY created_at DESC
                LIMIT 50
                """
            ).fetchall()

            agents = con.execute(
                "SELECT name,role,active FROM agents ORDER BY name"
            ).fetchall()

        out = ["=== BUZZARD v20 COUNCIL-ORCHESTRATOR-PINNWAND ===", "", "AUFGABEN"]

        if not tasks:
            out.append("- Keine Aufgaben.")
        else:
            for row in tasks:
                out.append(
                    f"#{row['id']} [{row['priority']}/10] {row['title']} | "
                    f"Status={row['status']} | Experte={row['assigned_to'] or '-'}"
                )

        out += ["", "NEUESTE EXPERTENMEINUNGEN"]

        if not opinions:
            out.append("- Keine Meinungen.")
        else:
            for row in opinions:
                out.append(
                    f"- Aufgabe #{row['task_id']} | {row['agent']} | "
                    f"{row['decision']} | Konfidenz={row['confidence']:.2f} | "
                    f"{row['note'] or '-'}"
                )

        out += ["", "EXPERTEN"]
        for row in agents:
            out.append(f"- {row['name']} | {row['role']} | aktiv={bool(row['active'])}")

        out += [
            "",
            "ORCHESTRIERUNGSREGEL:",
            "Experten-Agenten liefern Daten und Meinungen in ihrem Fachbereich.",
            "Widersprüchliche Meinungen werden gespeichert — nicht gelöscht oder verborgen.",
            "Synthese-Aufgaben können erstellt werden; finale Handelsentscheidungen bleiben beim Menschen.",
            "Autorisierte Manager treffen die endgültige Entscheidung.",
        ]
        return "\n".join(out)
