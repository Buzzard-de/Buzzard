import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_intelligence_v8.db"
BUZZARD_CATEGORIES_PATH = INTELLIGENCE_DIR.parent / "data" / "buzzard_categories.json"


def normalize(text):
    text = " ".join((text or "").strip().split())
    return text.casefold()


class CategoryDiscovery:
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
                CREATE TABLE IF NOT EXISTS categories(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    normalized TEXT NOT NULL,
                    parent_id INTEGER,
                    level INTEGER NOT NULL,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    UNIQUE(normalized, parent_id)
                );
                CREATE TABLE IF NOT EXISTS category_candidates(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    normalized TEXT NOT NULL,
                    parent_name TEXT,
                    level INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'NEW',
                    discovered_at TEXT NOT NULL,
                    UNIQUE(normalized, parent_name, source)
                );
                CREATE TABLE IF NOT EXISTS category_events(
                    id INTEGER PRIMARY KEY,
                    category_name TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    source TEXT,
                    detected_at TEXT NOT NULL
                );
                """
            )

    def _upsert_known_category(self, name, parent_id, level, now):
        normalized = normalize(name)
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM categories WHERE normalized=? AND parent_id IS ?",
                (normalized, parent_id),
            ).fetchone()
            if row:
                con.execute("UPDATE categories SET last_seen=? WHERE id=?", (now, row["id"]))
                return row["id"]
            cur = con.execute(
                """
                INSERT INTO categories(name,normalized,parent_id,level,first_seen,last_seen)
                VALUES(?,?,?,?,?,?)
                """,
                (name.strip(), normalized, parent_id, level, now, now),
            )
            return cur.lastrowid

    def _walk_buzzard_categories(self, nodes, parent_id=None, level=1):
        now = self.now()
        count = 0
        for node in nodes:
            cat_id = self._upsert_known_category(node["name"], parent_id, level, now)
            count += 1
            children = node.get("children") or []
            if children:
                count += self._walk_buzzard_categories(children, cat_id, level + 1)
        return count

    def sync_known_categories(self):
        if not BUZZARD_CATEGORIES_PATH.exists():
            raise FileNotFoundError(f"Missing {BUZZARD_CATEGORIES_PATH}")
        data = json.loads(BUZZARD_CATEGORIES_PATH.read_text(encoding="utf-8"))
        categories = data.get("categories") or data
        return self._walk_buzzard_categories(categories)

    def _find_known_category(self, name, parent_name):
        normalized = normalize(name)
        with self.connect() as con:
            rows = con.execute(
                "SELECT id, name, normalized, parent_id FROM categories"
            ).fetchall()
        by_id = {row["id"]: row for row in rows}

        for row in rows:
            if row["normalized"] != normalized:
                continue
            if not parent_name:
                if row["parent_id"] is None:
                    return row
                continue
            parent = by_id.get(row["parent_id"])
            if parent and normalize(parent["name"]) == normalize(parent_name):
                return row
        return None

    def add_candidate(self, name, parent, level, source, confidence):
        normalized = normalize(name)
        now = self.now()
        existing = self._find_known_category(name, parent)

        with self.connect() as con:
            con.execute(
                """
                INSERT OR IGNORE INTO category_candidates
                (name,normalized,parent_name,level,source,confidence,discovered_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (
                    name,
                    normalized,
                    parent,
                    level,
                    source,
                    max(0, min(1, confidence)),
                    now,
                ),
            )

            if existing:
                return f"BESTEHENDE KATEGORIE: {name}"

            con.execute(
                """
                INSERT INTO category_events
                (category_name,event_type,source,detected_at)
                VALUES(?,?,?,?)
                """,
                (name, "NEW_CATEGORY_SIGNAL", source, now),
            )

        return f"NEUES KATEGORIE-SIGNAL: {name}"

    def demo(self):
        samples = [
            ("Bremsystem", "Automotive", 2),
            ("Bremsbeläge", "Bremsystem", 3),
            ("Bremsscheiben", "Bremsystem", 3),
            ("Motoröle", "Automotive", 2),
            ("Motoröl 5W-30", "Motoröle", 3),
            ("Gewächshaus-Ausrüstung", "Garten", 2),
            ("Automatische Bewässerung", "Gewächshaus-Ausrüstung", 3),
            ("Smarte Bewässerungssteuerung", "Gewächshaus-Ausrüstung", 3),
        ]
        for name, parent, level in samples:
            self.add_candidate(name, parent, level, "demo-source", 0.85)

    def coverage_gaps(self, limit=15):
        with self.connect() as con:
            return con.execute(
                """
                SELECT c.name
                FROM categories c
                LEFT JOIN categories child ON child.parent_id = c.id
                WHERE c.level = 1
                GROUP BY c.id
                HAVING COUNT(child.id) = 0
                ORDER BY c.name
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    def report(self):
        with self.connect() as con:
            candidates = con.execute(
                """
                SELECT name,parent_name,level,source,confidence,status,discovered_at
                FROM category_candidates
                ORDER BY confidence DESC, level, name
                """
            ).fetchall()
            events = con.execute(
                """
                SELECT category_name,event_type,source,detected_at
                FROM category_events
                ORDER BY detected_at DESC LIMIT 30
                """
            ).fetchall()
            known_count = con.execute("SELECT COUNT(*) c FROM categories").fetchone()["c"]

        out = [
            "=== BUZZARD v8 KATEGORIE-ENTDECKUNG ===",
            "",
            f"Bekannte Buzzard-Kategorien (Referenz): {known_count}",
            "",
            "NEUE / OFFENE KATEGORIE-SIGNALE",
        ]

        if not candidates:
            out.append("- Noch keine Kategorie-Signale.")
        for row in candidates:
            out.append(
                f"- {row['name']} | übergeordnet={row['parent_name'] or '-'} | "
                f"Ebene={row['level']} | Konfidenz={row['confidence']:.2f} | "
                f"Status={row['status']} | Quelle={row['source']}"
            )

        out += ["", "LETZTE KATEGORIE-EREIGNISSE"]
        if not events:
            out.append("- Keine Ereignisse.")
        for row in events:
            out.append(
                f"- {row['event_type']} | {row['category_name']} | "
                f"{row['source']} | {row['detected_at']}"
            )

        gaps = self.coverage_gaps()
        out += ["", "ABDECKUNGSLÜCKEN (Hauptkategorien ohne Unterkategorien im Katalog)"]
        if gaps:
            for gap in gaps:
                out.append(f"- {gap['name']}")
        else:
            out.append("- Keine offensichtlichen Lücken in der Stichprobe.")

        out += [
            "",
            "REGEL:",
            "Kategorie-Signale sind keine automatischen Shop-Entscheidungen.",
            "Vor Aufnahme in Buzzard: Quelle und Rechtemäßigkeit prüfen.",
        ]
        return "\n".join(out)
