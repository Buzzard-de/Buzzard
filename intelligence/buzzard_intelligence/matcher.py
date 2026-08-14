import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_product_matching_v24.db"


class ProductMatcher:
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
                CREATE TABLE IF NOT EXISTS canonical_products(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    brand TEXT,
                    category TEXT,
                    variant TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS listings(
                    id INTEGER PRIMARY KEY,
                    canonical_id INTEGER,
                    source TEXT NOT NULL,
                    name TEXT NOT NULL,
                    brand TEXT,
                    category TEXT,
                    variant TEXT,
                    ean TEXT,
                    gtin TEXT,
                    mpn TEXT,
                    oem TEXT,
                    url TEXT,
                    match_status TEXT NOT NULL DEFAULT 'UNMATCHED',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS match_candidates(
                    id INTEGER PRIMARY KEY,
                    listing_id INTEGER NOT NULL,
                    candidate_id INTEGER NOT NULL,
                    score REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'REVIEW',
                    reasons TEXT,
                    created_at TEXT NOT NULL,
                    UNIQUE(listing_id,candidate_id)
                );

                CREATE TABLE IF NOT EXISTS match_events(
                    id INTEGER PRIMARY KEY,
                    listing_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def norm(self, value):
        value = (value or "").lower()
        return re.sub(r"[^a-z0-9äöüßçğıİşñ]+", "", value)

    def add_canonical(self, name, brand, category, variant):
        now = self.now()
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO canonical_products
                (name,brand,category,variant,created_at)
                VALUES(?,?,?,?,?)
                """,
                (name, brand, category, variant, now),
            )
        return f"Kanonisches Produkt #{cur.lastrowid} angelegt."

    def add_listing(
        self,
        canonical_id,
        source,
        name,
        brand,
        category,
        variant,
        ean,
        gtin,
        mpn,
        oem,
        url,
    ):
        now = self.now()
        with self.connect() as con:
            if canonical_id:
                row = con.execute(
                    "SELECT id FROM canonical_products WHERE id=?",
                    (canonical_id,),
                ).fetchone()
                if not row:
                    return "Kanonisches Produkt nicht gefunden."
                status = "MATCHED"
            else:
                status = "UNMATCHED"

            cur = con.execute(
                """
                INSERT INTO listings
                (canonical_id,source,name,brand,category,variant,ean,gtin,
                 mpn,oem,url,match_status,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    canonical_id,
                    source,
                    name,
                    brand,
                    category,
                    variant,
                    ean,
                    gtin,
                    mpn,
                    oem,
                    url,
                    status,
                    now,
                ),
            )
        return f"Quell-Listing #{cur.lastrowid} gespeichert | Status={status}"

    def score(self, a, b):
        reasons = []
        score = 0

        for field, weight, label in [
            ("ean", 60, "EAN-Übereinstimmung"),
            ("gtin", 60, "GTIN-Übereinstimmung"),
            ("mpn", 50, "MPN-Übereinstimmung"),
            ("oem", 50, "OEM-Teilenummer-Übereinstimmung"),
            ("brand", 15, "Marken-Übereinstimmung"),
            ("category", 10, "Kategorie-Übereinstimmung"),
            ("variant", 10, "Varianten-Übereinstimmung"),
            ("name", 15, "Produktname-Ähnlichkeit"),
        ]:
            av = a[field] or ""
            bv = b[field] or ""
            if field == "name":
                na, nb = self.norm(av), self.norm(bv)
                if na and nb and (na == nb or na in nb or nb in na):
                    score += weight
                    reasons.append(label)
            elif av and bv and self.norm(av) == self.norm(bv):
                score += weight
                reasons.append(label)

        for field in ("ean", "gtin", "mpn", "oem"):
            av = a[field] or ""
            bv = b[field] or ""
            if av and bv and self.norm(av) != self.norm(bv):
                score -= 35
                reasons.append(f"{field.upper()}-Widerspruch")

        score = max(0, min(100, score))
        return score, reasons

    def match(self, listing_id, candidate_id):
        with self.connect() as con:
            a = con.execute(
                "SELECT * FROM listings WHERE id=?",
                (listing_id,),
            ).fetchone()
            b = con.execute(
                "SELECT * FROM listings WHERE id=?",
                (candidate_id,),
            ).fetchone()

            if not a or not b:
                return "Quell-Listing nicht gefunden."

            score, reasons = self.score(a, b)

            if score >= 85:
                status = "HIGH_CONFIDENCE"
            elif score >= 60:
                status = "REVIEW"
            else:
                status = "LOW_CONFIDENCE"

            con.execute(
                """
                INSERT OR REPLACE INTO match_candidates
                (listing_id,candidate_id,score,status,reasons,created_at)
                VALUES(?,?,?,?,?,?)
                """,
                (listing_id, candidate_id, score, status, "; ".join(reasons), self.now()),
            )

        return (
            f"Matching-Analyse: {score}/100 | {status}\n"
            f"Gründe: {', '.join(reasons) if reasons else 'keine ausreichenden gemeinsamen Signale'}"
        )

    def demo(self):
        self.add_canonical("5W-30 Motoröl", "Example", "Automotive", "5L")
        self.add_listing(
            1,
            "Store A",
            "Example 5W-30 Engine Oil 5L",
            "Example",
            "Automotive",
            "5L",
            "1234567890123",
            "",
            "ABC-5W30",
            "ABC-5W30",
            "https://example.com/a",
        )
        self.add_listing(
            None,
            "Store B",
            "Motoröl 5W-30 5L",
            "Example",
            "Automotive",
            "5L",
            "1234567890123",
            "",
            "ABC-5W30",
            "ABC-5W30",
            "https://example.com/b",
        )
        self.match(1, 2)

    def report(self):
        with self.connect() as con:
            canonical = con.execute(
                """
                SELECT id,name,brand,category,variant
                FROM canonical_products ORDER BY id
                """
            ).fetchall()

            listings = con.execute(
                """
                SELECT id,canonical_id,source,name,brand,ean,gtin,mpn,oem,
                       match_status
                FROM listings ORDER BY id
                """
            ).fetchall()

            candidates = con.execute(
                """
                SELECT listing_id,candidate_id,score,status,reasons
                FROM match_candidates ORDER BY score DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v24 PRODUCT MATCHING BERICHT ===", "", "KANONISCHE PRODUKTE"]
        for row in canonical:
            out.append(
                f"- #{row['id']} {row['name']} | Marke={row['brand'] or '-'} | "
                f"Kategorie={row['category'] or '-'} | Variante={row['variant'] or '-'}"
            )

        out += ["", "QUELL-LISTINGS"]
        for row in listings:
            out.append(
                f"- #{row['id']} {row['source']} | {row['name']} | "
                f"Status={row['match_status']} | EAN={row['ean'] or '-'} | "
                f"MPN={row['mpn'] or '-'} | OEM={row['oem'] or '-'}"
            )

        out += ["", "MATCHING-KANDIDATEN"]
        for row in candidates:
            out.append(
                f"- {row['listing_id']} <-> {row['candidate_id']} | "
                f"Score={row['score']:.0f} | {row['status']} | {row['reasons'] or '-'}"
            )

        out += [
            "",
            "REGELN:",
            "Ähnlicher Name allein ist kein Produkt-Match.",
            "Widersprüchliche Identifikationsnummern sind starkes Negativsignal.",
            "Unklare Matches bleiben zur menschlichen/expert Review.",
            "Matching-Ergebnis ist kein Beweis für Originalität oder rechtliche Konformität.",
        ]
        return "\n".join(out)
