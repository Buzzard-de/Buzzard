import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_mission_v30.db"

MISSION_STATUSES = {
    "PLANNED",
    "RUNNING",
    "REVIEW",
    "WAITING_HUMAN",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "BLOCKED",
}

TASK_STATUSES = {
    "NEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "WAITING",
    "REVIEW",
    "COMPLETED",
    "BLOCKED",
}


class MissionEngine:
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
                CREATE TABLE IF NOT EXISTS missions(
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    details TEXT,
                    priority INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    human_decision TEXT,
                    human_note TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS mission_tasks(
                    id INTEGER PRIMARY KEY,
                    mission_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    agent TEXT NOT NULL,
                    purpose TEXT,
                    priority INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    depends_on TEXT,
                    result TEXT,
                    confidence REAL,
                    evidence TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS mission_conflicts(
                    id INTEGER PRIMARY KEY,
                    mission_id INTEGER NOT NULL,
                    task_a INTEGER NOT NULL,
                    task_b INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'OPEN',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS mission_log(
                    id INTEGER PRIMARY KEY,
                    mission_id INTEGER NOT NULL,
                    task_id INTEGER,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def create_mission(self, title, details="", priority=10):
        priority = max(1, min(10, priority))
        now = self.now()

        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO missions
                (title,details,priority,status,created_at,updated_at)
                VALUES(?,?,?,?,?,?)
                """,
                (title, details, priority, "PLANNED", now, now),
            )
            mission_id = cur.lastrowid

            plan = [
                (
                    "Market Intelligence",
                    "Market Intelligence",
                    "Land/Markt-Nachfrage- und Chancensignale recherchieren.",
                    10,
                    "",
                ),
                (
                    "Category Intelligence",
                    "Category Intelligence",
                    "Kategorie- und Produktchancen identifizieren.",
                    9,
                    "",
                ),
                (
                    "Competitor Intelligence",
                    "Competitor Intelligence",
                    "Wettbewerber/Kategoriestruktur aus legalen Quellen prüfen.",
                    8,
                    "1,2",
                ),
                (
                    "Supplier Intelligence",
                    "Supplier Intelligence",
                    "Geeignete Lieferanten und Integrationen recherchieren.",
                    8,
                    "1,2",
                ),
                (
                    "Product Matching",
                    "Product Matching",
                    "Gleiche Produkte über Identitätssignale verknüpfen.",
                    7,
                    "2,3,4",
                ),
                (
                    "Price Intelligence",
                    "Price Intelligence",
                    "Preissignale für vergleichbare Produkte analysieren.",
                    7,
                    "5",
                ),
                (
                    "Demand Forecasting",
                    "Demand Forecasting",
                    "Trend/Prognose aus vorhandenen Nachfrage-Signalen.",
                    7,
                    "1,2",
                ),
                (
                    "Profitability",
                    "Profitability",
                    "Nettogewinn mit allen bekannten Kosten berechnen.",
                    9,
                    "4,6",
                ),
                (
                    "Authenticity & Trust",
                    "Authenticity & Trust",
                    "Vertrauen in Produkt/Marke/Lieferkette prüfen.",
                    9,
                    "4,5",
                ),
                (
                    "Risk & Compliance",
                    "Risk & Compliance",
                    "Markt-, Produkt-, Zoll-, Steuer- und Sicherheitsrisiken prüfen.",
                    10,
                    "1,4,5",
                ),
                (
                    "Official Verification",
                    "Official Verification",
                    "Kritische Claims mit offiziellen Quellen verifizieren.",
                    10,
                    "3,4,9,10",
                ),
                (
                    "Council Manager",
                    "Council Manager",
                    "Experten-Outputs synthetisieren; Widersprüche sichtbar halten.",
                    10,
                    "6,7,8,9,10,11",
                ),
            ]

            task_ids = []
            for task_title, agent, purpose, task_priority, depends in plan:
                cur2 = con.execute(
                    """
                    INSERT INTO mission_tasks
                    (mission_id,title,agent,purpose,priority,status,depends_on,
                     created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        mission_id,
                        task_title,
                        agent,
                        purpose,
                        task_priority,
                        "NEW",
                        depends,
                        now,
                        now,
                    ),
                )
                task_ids.append(cur2.lastrowid)

            con.execute(
                """
                INSERT INTO mission_log
                (mission_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (
                    mission_id,
                    "MISSION_CREATED",
                    "Council Manager",
                    f"{len(task_ids)} Experten-Aufgaben geplant.",
                    now,
                ),
            )

            con.execute(
                """
                UPDATE missions SET status='RUNNING',updated_at=? WHERE id=?
                """,
                (now, mission_id),
            )

        return f"Mission #{mission_id} angelegt und {len(task_ids)} Experten-Aufgaben zugewiesen."

    def add_result(self, task_id, agent, result, confidence, evidence):
        confidence = max(0, min(1, confidence))
        now = self.now()

        with self.connect() as con:
            task = con.execute(
                """
                SELECT id,mission_id FROM mission_tasks WHERE id=?
                """,
                (task_id,),
            ).fetchone()

            if not task:
                return "Aufgabe nicht gefunden."

            con.execute(
                """
                UPDATE mission_tasks
                SET result=?,confidence=?,evidence=?,status='COMPLETED',
                    updated_at=?
                WHERE id=?
                """,
                (result, confidence, evidence, now, task_id),
            )

            con.execute(
                """
                INSERT INTO mission_log
                (mission_id,task_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?,?)
                """,
                (task["mission_id"], task_id, "TASK_RESULT", agent, result, now),
            )

            open_tasks = con.execute(
                """
                SELECT COUNT(*) n FROM mission_tasks
                WHERE mission_id=? AND status NOT IN ('COMPLETED')
                """,
                (task["mission_id"],),
            ).fetchone()["n"]

            if open_tasks == 0:
                con.execute(
                    """
                    UPDATE missions
                    SET status='WAITING_HUMAN',updated_at=?
                    WHERE id=?
                    """,
                    (now, task["mission_id"]),
                )

        return f"Aufgabe #{task_id} Ergebnis gespeichert."

    def approve(self, mission_id, decision, note):
        decision = decision.upper()
        if decision not in ("APPROVED", "REJECTED"):
            return "Entscheidung muss APPROVED oder REJECTED sein."

        now = self.now()
        with self.connect() as con:
            mission = con.execute(
                "SELECT id FROM missions WHERE id=?",
                (mission_id,),
            ).fetchone()
            if not mission:
                return "Mission nicht gefunden."

            con.execute(
                """
                UPDATE missions
                SET status=?,human_decision=?,human_note=?,updated_at=?
                WHERE id=?
                """,
                (decision, decision, note, now, mission_id),
            )

            con.execute(
                """
                INSERT INTO mission_log
                (mission_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (mission_id, "HUMAN_DECISION", "Human Approver", note, now),
            )

        return f"Mission #{mission_id} -> {decision}"

    def demo(self):
        self.create_mission(
            "Neue Automotive-Produktchancen in Deutschland recherchieren",
            "Demo: Markt, Produkt, Wettbewerb, Lieferant, Preis, Nachfrage, Gewinn, Risiko.",
            10,
        )

    def board(self):
        with self.connect() as con:
            missions = con.execute(
                """
                SELECT id,title,priority,status,human_decision,
                       created_at,updated_at
                FROM missions
                ORDER BY priority DESC,updated_at DESC
                """
            ).fetchall()

            tasks = con.execute(
                """
                SELECT id,mission_id,title,agent,priority,status,
                       result,confidence,depends_on
                FROM mission_tasks
                ORDER BY mission_id,priority DESC,id
                """
            ).fetchall()

            conflicts = con.execute(
                """
                SELECT mission_id,task_a,task_b,description,status
                FROM mission_conflicts
                WHERE status='OPEN'
                """
            ).fetchall()

        out = ["=== BUZZARD v30 AUTONOMOUS MISSION BOARD ===", "", "MISSIONS"]

        for mission in missions:
            out.append(
                f"- Mission #{mission['id']} | {mission['title']} | "
                f"Status={mission['status']} | Mensch={mission['human_decision'] or '-'}"
            )

            for task in [row for row in tasks if row["mission_id"] == mission["id"]]:
                conf = f"{task['confidence']:.2f}" if task["confidence"] is not None else "-"
                out.append(
                    f"  #{task['id']} [{task['priority']}/10] {task['agent']} | "
                    f"{task['title']} | {task['status']} | Konfidenz={conf}"
                )

        out += ["", "OFFENE WIDERSPRÜCHE"]
        if conflicts:
            for conflict in conflicts:
                out.append(
                    f"- Mission #{conflict['mission_id']} | Aufgabe {conflict['task_a']} "
                    f"<-> {conflict['task_b']} | {conflict['description']}"
                )
        else:
            out.append("- Keine offenen Widerspruchseinträge.")

        out += [
            "",
            "v30 REGELN:",
            "Das System kann Recherche und Analyse autonom orchestrieren.",
            "Für Einkauf, Zahlung, rechtliche Freigabe oder irreversible Handelsentscheidungen ist Menschen-Freigabe erforderlich.",
            "Quellen und Belege werden mit Aufgaben-Outputs gespeichert.",
        ]
        return "\n".join(out)
