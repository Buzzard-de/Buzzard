import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_official_verification_v29.db"

SOURCE_TYPES = {
    "OFFICIAL_GOVERNMENT",
    "OFFICIAL_MANUFACTURER",
    "OFFICIAL_PLATFORM",
    "OFFICIAL_STANDARD",
    "SECONDARY",
    "USER_PROVIDED",
}

STATUSES = {
    "UNVERIFIED",
    "PENDING",
    "VERIFIED",
    "CONFLICT",
    "OUTDATED",
    "REJECTED",
}


class OfficialVerifier:
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
                CREATE TABLE IF NOT EXISTS claims(
                    id INTEGER PRIMARY KEY,
                    entity TEXT NOT NULL,
                    claim_text TEXT NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                    verification_score REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sources(
                    id INTEGER PRIMARY KEY,
                    claim_id INTEGER NOT NULL,
                    source_type TEXT NOT NULL,
                    url TEXT NOT NULL,
                    publisher TEXT NOT NULL,
                    published_at TEXT,
                    note TEXT,
                    source_quality REAL NOT NULL,
                    observed_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS verification_events(
                    id INTEGER PRIMARY KEY,
                    claim_id INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def add_claim(self, entity, text, category):
        now = self.now()
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO claims
                (entity,claim_text,category,status,verification_score,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (entity, text, category, "UNVERIFIED", 0, now, now),
            )
        return f"Claim #{cur.lastrowid} angelegt."

    def add_source(self, claim_id, source_type, url, publisher, published, note):
        source_type = source_type.upper()
        if source_type not in SOURCE_TYPES:
            return "Ungültiger Quellentyp: " + ", ".join(sorted(SOURCE_TYPES))

        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return "Nur http/https-URLs werden akzeptiert."

        quality = {
            "OFFICIAL_GOVERNMENT": 100,
            "OFFICIAL_MANUFACTURER": 95,
            "OFFICIAL_PLATFORM": 92,
            "OFFICIAL_STANDARD": 92,
            "SECONDARY": 55,
            "USER_PROVIDED": 35,
        }[source_type]

        now = self.now()
        with self.connect() as con:
            claim = con.execute(
                "SELECT id FROM claims WHERE id=?",
                (claim_id,),
            ).fetchone()
            if not claim:
                return "Claim nicht gefunden."

            con.execute(
                """
                INSERT INTO sources
                (claim_id,source_type,url,publisher,published_at,note,
                 source_quality,observed_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    claim_id,
                    source_type,
                    url,
                    publisher,
                    published,
                    note,
                    quality,
                    now,
                ),
            )

            con.execute(
                """
                UPDATE claims
                SET status='PENDING',updated_at=?
                WHERE id=?
                """,
                (now, claim_id),
            )

        return f"Quelle gespeichert: {publisher} | Qualität={quality}"

    def verify(self, claim_id, status, note):
        status = status.upper()
        if status not in STATUSES:
            return "Ungültiger Status: " + ", ".join(sorted(STATUSES))

        now = self.now()
        with self.connect() as con:
            claim = con.execute(
                "SELECT id FROM claims WHERE id=?",
                (claim_id,),
            ).fetchone()
            if not claim:
                return "Claim nicht gefunden."

            sources = con.execute(
                """
                SELECT source_quality FROM sources
                WHERE claim_id=?
                ORDER BY source_quality DESC
                """,
                (claim_id,),
            ).fetchall()

            best = max([row["source_quality"] for row in sources], default=0)

            if status == "VERIFIED":
                score = best
                if best < 90:
                    status = "PENDING"
                    note = (note + " " if note else "") + "Primäre/offizielle Quellenstärke unzureichend."
            elif status == "CONFLICT":
                score = 20
            elif status == "OUTDATED":
                score = 15
            else:
                score = 0

            con.execute(
                """
                UPDATE claims
                SET status=?,verification_score=?,updated_at=?
                WHERE id=?
                """,
                (status, score, now, claim_id),
            )

            con.execute(
                """
                INSERT INTO verification_events
                (claim_id,status,note,created_at)
                VALUES(?,?,?,?)
                """,
                (claim_id, status, note, now),
            )

        return f"Claim #{claim_id} -> {status} | Score={score:.0f}"

    def demo(self):
        self.add_claim(
            "Example Motor Oil",
            "Hersteller listet Produkt im eigenen Katalog.",
            "MANUFACTURER",
        )
        self.add_source(
            1,
            "OFFICIAL_MANUFACTURER",
            "https://example.com/product",
            "Example Manufacturer",
            "2026-08-01",
            "Demo offizielle Herstellerquelle.",
        )
        self.verify(1, "VERIFIED", "Demo-Verifizierung.")

        self.add_claim(
            "Example Product",
            "Produkt erfüllt Verkaufsvoraussetzungen in bestimmtem Markt.",
            "MARKET_ACCESS",
        )
        self.add_source(
            2,
            "SECONDARY",
            "https://example.org/article",
            "Example Secondary",
            "2026-07-01",
            "Sekundärquelle; offizielle Verifizierung ausstehend.",
        )

    def report(self):
        with self.connect() as con:
            claims = con.execute(
                """
                SELECT id,entity,claim_text,category,status,
                       verification_score,updated_at
                FROM claims
                ORDER BY verification_score DESC,updated_at DESC
                """
            ).fetchall()

            sources = con.execute(
                """
                SELECT claim_id,source_type,publisher,source_quality,url
                FROM sources
                ORDER BY source_quality DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v29 OFFICIAL VERIFICATION BERICHT ===", "", "CLAIMS"]
        for row in claims:
            out.append(
                f"- #{row['id']} {row['entity']} | {row['category']} | "
                f"{row['status']} | Score={row['verification_score']:.0f}"
            )
            out.append(f"  → {row['claim_text']}")

        out += ["", "QUELLEN"]
        for row in sources:
            out.append(
                f"- Claim #{row['claim_id']} | {row['source_type']} | "
                f"{row['publisher']} | Qualität={row['source_quality']:.0f} | {row['url']}"
            )

        out += [
            "",
            "REGELN:",
            "Offizielle Quellen sind starke Belege, aber kein Rechtsberatungsersatz.",
            "Quellenumfang und Aktualität werden separat geprüft.",
            "Widersprüchliche Quellen werden nicht verborgen; Status CONFLICT.",
            "Nicht verifizierbare Claims werden nicht als VERIFIED markiert.",
        ]
        return "\n".join(out)
