import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_web_research_v22.db"


class WebResearch:
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
                CREATE TABLE IF NOT EXISTS research_jobs(
                    id INTEGER PRIMARY KEY,
                    query TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'OPEN',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sources(
                    id INTEGER PRIMARY KEY,
                    research_id INTEGER NOT NULL,
                    url TEXT NOT NULL,
                    title TEXT,
                    domain TEXT,
                    source_type TEXT,
                    accessibility TEXT NOT NULL DEFAULT 'PUBLIC',
                    observed_at TEXT NOT NULL,
                    UNIQUE(research_id,url)
                );

                CREATE TABLE IF NOT EXISTS findings(
                    id INTEGER PRIMARY KEY,
                    research_id INTEGER NOT NULL,
                    source_id INTEGER NOT NULL,
                    claim TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS research_events(
                    id INTEGER PRIMARY KEY,
                    research_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def create_research(self, query, purpose):
        now = self.now()
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO research_jobs(query,purpose,status,created_at,updated_at)
                VALUES(?,?,?,?,?)
                """,
                (query, purpose, "OPEN", now, now),
            )
            research_id = cur.lastrowid
            con.execute(
                """
                INSERT INTO research_events
                (research_id,event_type,details,created_at)
                VALUES(?,?,?,?)
                """,
                (research_id, "CREATED", query, now),
            )
        return f"Forschungsaufgabe #{research_id} erstellt."

    def add_source(self, research_id, url, title, domain):
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return "Nur http/https-Quellen werden akzeptiert."

        domain = domain or parsed.netloc
        now = self.now()

        with self.connect() as con:
            job = con.execute(
                "SELECT id FROM research_jobs WHERE id=?",
                (research_id,),
            ).fetchone()
            if not job:
                return "Forschungsaufgabe nicht gefunden."

            con.execute(
                """
                INSERT OR IGNORE INTO sources
                (research_id,url,title,domain,source_type,accessibility,observed_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (research_id, url, title, domain, "WEB", "PUBLIC", now),
            )

        return f"Quelle gespeichert: {domain}"

    def add_finding(self, research_id, source_id, claim, confidence, note):
        confidence = max(0, min(1, confidence))
        now = self.now()

        with self.connect() as con:
            source = con.execute(
                """
                SELECT id FROM sources
                WHERE id=? AND research_id=?
                """,
                (source_id, research_id),
            ).fetchone()

            if not source:
                return "Quelle gehört nicht zu dieser Forschungsaufgabe oder wurde nicht gefunden."

            con.execute(
                """
                INSERT INTO findings
                (research_id,source_id,claim,confidence,note,created_at)
                VALUES(?,?,?,?,?,?)
                """,
                (research_id, source_id, claim, confidence, note, now),
            )
            con.execute(
                "UPDATE research_jobs SET updated_at=? WHERE id=?",
                (now, research_id),
            )

        return f"Erkenntnis gespeichert. Konfidenz={confidence:.2f}"

    def demo(self):
        message = self.create_research(
            "Germany automotive aftermarket trends",
            "Market Intelligence",
        )
        research_id = int(message.split("#")[1].split()[0])
        self.add_source(
            research_id,
            "https://example.com/market-report",
            "Example public market report",
            "example.com",
        )
        with self.connect() as con:
            source_row = con.execute(
                "SELECT id FROM sources WHERE research_id=? ORDER BY id DESC LIMIT 1",
                (research_id,),
            ).fetchone()
        source_id = source_row["id"] if source_row else 1
        self.add_finding(
            research_id,
            source_id,
            "Beispiel-Fund aus offener Quelle; nicht als echte Daten verwenden.",
            0.50,
            "Demo-Eintrag.",
        )

    def report(self):
        with self.connect() as con:
            jobs = con.execute(
                """
                SELECT id,query,purpose,status,created_at,updated_at
                FROM research_jobs
                ORDER BY updated_at DESC
                """
            ).fetchall()

            sources = con.execute(
                """
                SELECT research_id,COUNT(*) n
                FROM sources
                GROUP BY research_id
                """
            ).fetchall()

            findings = con.execute(
                """
                SELECT research_id,COUNT(*) n
                FROM findings
                GROUP BY research_id
                """
            ).fetchall()

        source_map = {row["research_id"]: row["n"] for row in sources}
        finding_map = {row["research_id"]: row["n"] for row in findings}

        out = ["=== BUZZARD v22 WEB RESEARCH BERICHT ==="]
        for row in jobs:
            out.append(
                f"- #{row['id']} | {row['purpose']} | {row['query']} | "
                f"Status={row['status']} | Quellen={source_map.get(row['id'], 0)} | "
                f"Erkenntnisse={finding_map.get(row['id'], 0)}"
            )

        out += [
            "",
            "FORSCHUNGSREGELN:",
            "Nur öffentliche und legal zugängliche Quellen.",
            "Kein Umgehen von CAPTCHA, Login-Walls oder Zugriffskontrollen.",
            "Verbindung zwischen Erkenntnis und Quelle bleibt erhalten.",
            "Einzelquellen-Behauptungen gelten nicht automatisch als verifiziert.",
            "Ohne Quelle werden keine Informationen erfunden.",
        ]
        return "\n".join(out)
