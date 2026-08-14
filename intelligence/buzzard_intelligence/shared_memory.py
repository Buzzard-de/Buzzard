import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_shared_memory_v12.db"

STATUSES = frozenset({"ACTIVE", "VERIFIED", "DISPUTED", "ARCHIVED", "REJECTED"})


class SharedMemory:
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
                    memory_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    entity TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tags(
                    id INTEGER PRIMARY KEY,
                    memory_id INTEGER NOT NULL,
                    tag TEXT NOT NULL,
                    UNIQUE(memory_id,tag)
                );

                CREATE TABLE IF NOT EXISTS memory_links(
                    id INTEGER PRIMARY KEY,
                    memory_id INTEGER NOT NULL,
                    linked_memory_id INTEGER NOT NULL,
                    relation TEXT NOT NULL,
                    UNIQUE(memory_id,linked_memory_id,relation)
                );

                CREATE TABLE IF NOT EXISTS memory_audit(
                    id INTEGER PRIMARY KEY,
                    memory_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def add(self, memory_type, text, source, confidence, tags="", entity=""):
        now = self.now()
        confidence = max(0, min(1, confidence))
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO memories
                (memory_type,content,source,confidence,status,entity,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (memory_type, text, source, confidence, "ACTIVE", entity, now, now),
            )
            memory_id = cur.lastrowid

            for tag in [part.strip() for part in tags.split(",") if part.strip()]:
                con.execute(
                    "INSERT OR IGNORE INTO tags(memory_id,tag) VALUES(?,?)",
                    (memory_id, tag),
                )

            con.execute(
                """
                INSERT INTO memory_audit
                (memory_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (memory_id, "CREATED", source, text, now),
            )

        return f"Shared Memory #{memory_id} gespeichert."

    def search(self, query):
        q = f"%{query}%"
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT m.id,m.memory_type,m.content,m.source,m.confidence,
                       m.status,m.entity,m.created_at,
                       GROUP_CONCAT(t.tag,', ') tags
                FROM memories m
                LEFT JOIN tags t ON t.memory_id=m.id
                WHERE m.content LIKE ?
                   OR m.entity LIKE ?
                   OR t.tag LIKE ?
                GROUP BY m.id
                ORDER BY m.updated_at DESC
                LIMIT 100
                """,
                (q, q, q),
            ).fetchall()

        if not rows:
            return "Keine Treffer in Shared Memory."

        out = [f"=== BUZZARD SHARED MEMORY: {query} ==="]
        for row in rows:
            out.append(
                f"#{row['id']} | {row['memory_type']} | "
                f"{row['content']} | Quelle={row['source']} | "
                f"Konfidenz={row['confidence']:.2f} | Status={row['status']} | "
                f"Tags={row['tags'] or '-'} | Entität={row['entity'] or '-'}"
            )
        return "\n".join(out)

    def update_status(self, memory_id, status, actor="system"):
        if status not in STATUSES:
            return f"Ungültiger Status. Erlaubt: {', '.join(sorted(STATUSES))}"

        now = self.now()
        with self.connect() as con:
            row = con.execute("SELECT id FROM memories WHERE id=?", (memory_id,)).fetchone()
            if not row:
                return "Eintrag nicht gefunden."

            con.execute(
                "UPDATE memories SET status=?, updated_at=? WHERE id=?",
                (status, now, memory_id),
            )
            con.execute(
                """
                INSERT INTO memory_audit
                (memory_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (memory_id, "STATUS_CHANGED", actor, status, now),
            )

        return f"Shared Memory #{memory_id} -> {status}"

    def timeline(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT id,memory_type,content,source,confidence,status,created_at
                FROM memories
                ORDER BY created_at DESC
                LIMIT 100
                """
            ).fetchall()

        if not rows:
            return "Shared Memory ist leer."

        out = ["=== BUZZARD SHARED MEMORY — ZEITLINIE ==="]
        for row in rows:
            out.append(
                f"{row['created_at']} | #{row['id']} | {row['memory_type']} | "
                f"{row['status']} | {row['content']}"
            )
        return "\n".join(out)

    def link(self, memory_id, linked_memory_id, relation="related"):
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR IGNORE INTO memory_links
                (memory_id,linked_memory_id,relation)
                VALUES(?,?,?)
                """,
                (memory_id, linked_memory_id, relation),
            )
            con.execute(
                """
                INSERT INTO memory_audit
                (memory_id,action,actor,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (memory_id, "LINKED", "system", f"{linked_memory_id}:{relation}", now),
            )
        return f"Verknüpfung #{memory_id} -> #{linked_memory_id} ({relation}) gespeichert."
