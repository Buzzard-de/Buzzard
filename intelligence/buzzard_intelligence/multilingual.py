import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_multilingual_v13.db"

SUPPORTED = frozenset({"tr", "de", "en", "ar", "fr", "es", "it", "nl", "pl"})


class MultilingualMemory:
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
                CREATE TABLE IF NOT EXISTS canonical_entities(
                    id INTEGER PRIMARY KEY,
                    canonical_name TEXT NOT NULL,
                    entity_type TEXT,
                    created_at TEXT NOT NULL,
                    UNIQUE(canonical_name,entity_type)
                );

                CREATE TABLE IF NOT EXISTS multilingual_terms(
                    id INTEGER PRIMARY KEY,
                    entity_id INTEGER NOT NULL,
                    language TEXT NOT NULL,
                    term TEXT NOT NULL,
                    source TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    translation_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                    created_at TEXT NOT NULL,
                    UNIQUE(entity_id,language,term)
                );

                CREATE TABLE IF NOT EXISTS language_sources(
                    id INTEGER PRIMARY KEY,
                    source TEXT NOT NULL,
                    language TEXT NOT NULL,
                    observations INTEGER NOT NULL DEFAULT 0,
                    last_seen TEXT NOT NULL,
                    UNIQUE(source,language)
                );
                """
            )

    def add(self, language, text, canonical, entity, source, confidence):
        language = language.lower().split("-")[0]
        if language not in SUPPORTED:
            return f"Sprache noch nicht unterstützt: {language}"

        now = self.now()
        confidence = max(0, min(1, confidence))
        with self.connect() as con:
            row = con.execute(
                """
                SELECT id FROM canonical_entities
                WHERE canonical_name=? AND entity_type IS ?
                """,
                (canonical, entity or None),
            ).fetchone()

            if row:
                entity_id = row["id"]
            else:
                entity_id = con.execute(
                    """
                    INSERT INTO canonical_entities
                    (canonical_name,entity_type,created_at)
                    VALUES(?,?,?)
                    """,
                    (canonical, entity or None, now),
                ).lastrowid

            con.execute(
                """
                INSERT OR REPLACE INTO multilingual_terms
                (entity_id,language,term,source,confidence,translation_status,created_at)
                VALUES(?,?,?,?,?,'UNVERIFIED',?)
                """,
                (entity_id, language, text, source, confidence, now),
            )

            con.execute(
                """
                INSERT INTO language_sources(source,language,observations,last_seen)
                VALUES(?,?,1,?)
                ON CONFLICT(source,language)
                DO UPDATE SET observations=observations+1,last_seen=excluded.last_seen
                """,
                (source, language, now),
            )

        return f"Mehrsprachiger Begriff gespeichert: [{language}] {text} -> {canonical}"

    def demo(self):
        samples = [
            ("tr", "Motor Yağı 5W-30", "5W-30 Motor Yağı"),
            ("de", "Motoröl 5W-30", "5W-30 Motor Yağı"),
            ("en", "5W-30 Engine Oil", "5W-30 Motor Yağı"),
            ("fr", "Huile moteur 5W-30", "5W-30 Motor Yağı"),
            ("ar", "زيت محرك 5W-30", "5W-30 Motor Yağı"),
        ]
        for lang, text, canonical in samples:
            self.add(lang, text, canonical, "product", "demo", 0.95)

    def report(self):
        with self.connect() as con:
            entities = con.execute(
                """
                SELECT e.canonical_name,e.entity_type,
                       COUNT(t.id) terms,
                       COUNT(DISTINCT t.language) languages
                FROM canonical_entities e
                LEFT JOIN multilingual_terms t ON t.entity_id=e.id
                GROUP BY e.id
                ORDER BY languages DESC,terms DESC
                """
            ).fetchall()

            langs = con.execute(
                """
                SELECT language,SUM(observations) observations,
                       COUNT(DISTINCT source) sources
                FROM language_sources
                GROUP BY language
                ORDER BY observations DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v13 MEHRSPRACHIGER INTELLIGENCE-BERICHT ===", "", "KANONISCHE ENTITÄTEN"]
        for row in entities:
            out.append(
                f"- {row['canonical_name']} | Typ={row['entity_type'] or '-'} | "
                f"Begriffe={row['terms']} | Sprachen={row['languages']}"
            )

        out += ["", "SPRACHABDECKUNG"]
        for row in langs:
            out.append(
                f"- {row['language']} | Beobachtungen={row['observations']} | Quellen={row['sources']}"
            )

        out += [
            "",
            "PRINZIP:",
            "Begriffe in verschiedenen Sprachen können einer kanonischen Entität zugeordnet werden.",
            "Automatische Übersetzungen gelten nicht als verifiziert; Quelle und Konfidenz bleiben erhalten.",
        ]
        return "\n".join(out)
