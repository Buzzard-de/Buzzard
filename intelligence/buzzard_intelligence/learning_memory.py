import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_learning_memory_v31.db"

KINDS = {"FACT", "SIGNAL", "DECISION", "LESSON", "PREFERENCE"}
STATUSES = {"ACTIVE", "NEEDS_REVIEW", "OUTDATED", "CONFLICT", "ARCHIVED"}


class LearningMemory:
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
                CREATE TABLE IF NOT EXISTS memories(
                    id INTEGER PRIMARY KEY,
                    kind TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    text TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memory_links(
                    id INTEGER PRIMARY KEY,
                    memory_id INTEGER NOT NULL,
                    related_memory_id INTEGER NOT NULL,
                    relation TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memory_events(
                    id INTEGER PRIMARY KEY,
                    memory_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def normalize(self, value):
        return re.sub(r"\s+", " ", (value or "").strip().lower())

    def remember(self, kind, topic, text, confidence=0.8, source=""):
        kind = kind.upper()
        if kind not in KINDS:
            return "Ungültiger Memory-Typ: " + ", ".join(sorted(KINDS))
        confidence = max(0, min(1, float(confidence)))
        now = self.now()

        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO memories
                (kind,topic,text,confidence,status,source,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (kind, topic, text, confidence, "ACTIVE", source, now, now),
            )
            memory_id = cur.lastrowid

            con.execute(
                """
                INSERT INTO memory_events
                (memory_id,action,details,created_at)
                VALUES(?,?,?,?)
                """,
                (memory_id, "CREATED", source, now),
            )

        return f"Memory #{memory_id} gespeichert."

    def lesson(self, topic, text):
        return self.remember("LESSON", topic, text, 0.95, "INTERNAL_LESSON")

    def recall(self, query, limit=20):
        terms = [term for term in self.normalize(query).split(" ") if len(term) >= 2]
        limit = max(1, min(100, limit))

        with self.connect() as con:
            rows = con.execute(
                """
                SELECT id,kind,topic,text,confidence,status,source,updated_at
                FROM memories
                WHERE status IN ('ACTIVE','NEEDS_REVIEW','CONFLICT')
                ORDER BY confidence DESC,updated_at DESC
                """
            ).fetchall()

        scored = []
        normalized_query = self.normalize(query)
        for row in rows:
            haystack = self.normalize(row["topic"] + " " + row["text"])
            score = sum(1 for term in terms if term in haystack)
            if normalized_query and normalized_query in haystack:
                score += 3
            if score:
                scored.append((score, row))

        scored.sort(key=lambda item: (item[0], item[1]["confidence"]), reverse=True)

        if not scored:
            return "Keine passenden Memory-Einträge gefunden."

        out = [f"=== BUZZARD LEARNING MEMORY RECALL: {query} ==="]
        for score, row in scored[:limit]:
            out.append(
                f"- #{row['id']} [{row['kind']}] {row['topic']} | "
                f"Konfidenz={row['confidence']:.2f} | Status={row['status']}"
            )
            out.append(f"  {row['text']}")
            if row["source"]:
                out.append(f"  Quelle: {row['source']}")
        return "\n".join(out)

    def set_status(self, memory_id, status):
        status = status.upper()
        if status not in STATUSES:
            return "Ungültiger Status: " + ", ".join(sorted(STATUSES))
        now = self.now()

        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM memories WHERE id=?",
                (memory_id,),
            ).fetchone()
            if not row:
                return "Memory-Eintrag nicht gefunden."

            con.execute(
                """
                UPDATE memories SET status=?,updated_at=? WHERE id=?
                """,
                (status, now, memory_id),
            )

            con.execute(
                """
                INSERT INTO memory_events
                (memory_id,action,details,created_at)
                VALUES(?,?,?,?)
                """,
                (memory_id, "STATUS_CHANGE", status, now),
            )

        return f"Memory #{memory_id} -> {status}"

    def demo(self):
        self.remember(
            "FACT",
            "Automotive",
            "Beispiel-Herstellerquelle listet Produkt.",
            0.96,
            "https://example.com/manufacturer",
        )
        self.remember(
            "SIGNAL",
            "Preis",
            "Preisrückgang-Signal für Beispielprodukt beobachtet.",
            0.82,
            "https://example.com/price",
        )
        self.lesson(
            "Lieferant",
            "Lieferanten ohne verifizierte Zuverlässigkeit und Dokumente nicht priorisieren.",
        )
        self.remember(
            "PREFERENCE",
            "Buzzard",
            "Bei kritischen Handelsentscheidungen Menschen-Freigabe beibehalten.",
            1.0,
            "INTERNAL_RULE",
        )

    def report(self):
        with self.connect() as con:
            counts = con.execute(
                """
                SELECT kind,status,COUNT(*) n
                FROM memories
                GROUP BY kind,status
                ORDER BY kind,status
                """
            ).fetchall()

            recent = con.execute(
                """
                SELECT id,kind,topic,confidence,status,updated_at
                FROM memories
                ORDER BY updated_at DESC
                LIMIT 20
                """
            ).fetchall()

        out = ["=== BUZZARD v31 LEARNING & MEMORY BERICHT ===", "", "MEMORY-STATUS"]
        for row in counts:
            out.append(f"- {row['kind']} | {row['status']} | {row['n']} Einträge")

        out += ["", "LETZTE EINTRÄGE"]
        for row in recent:
            out.append(
                f"- #{row['id']} [{row['kind']}] {row['topic']} | "
                f"Konfidenz={row['confidence']:.2f} | {row['status']}"
            )

        out += [
            "",
            "REGELN:",
            "Neue Information löscht alte Einträge nicht stillschweigend.",
            "Quelle, Konfidenz, Status und Zeit bleiben erhalten.",
            "Widersprüche können als CONFLICT gespeichert werden.",
            "Kritische Handelsregeln dürfen ohne Menschen-Freigabe nicht geändert werden.",
        ]
        return "\n".join(out)
