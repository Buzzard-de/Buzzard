import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_trust_v15.db"

STATUSES = frozenset({"UNVERIFIED", "PENDING", "VERIFIED", "REJECTED", "DISPUTED"})

TRUST_SCORES = {
    "UNVERIFIED": 0,
    "PENDING": 35,
    "VERIFIED": 100,
    "REJECTED": 0,
    "DISPUTED": 20,
}


class TrustEngine:
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
                CREATE TABLE IF NOT EXISTS products(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    brand TEXT,
                    supplier TEXT,
                    source TEXT,
                    status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                    trust_score REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS evidence(
                    id INTEGER PRIMARY KEY,
                    product_id INTEGER NOT NULL,
                    evidence_type TEXT NOT NULL,
                    issuer TEXT,
                    reference TEXT,
                    verified INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS trust_events(
                    id INTEGER PRIMARY KEY,
                    product_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def add_product(self, name, brand, supplier, source):
        now = self.now()
        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO products
                (name,brand,supplier,source,status,trust_score,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (name, brand, supplier, source, "UNVERIFIED", 0, now, now),
            )
            product_id = cur.lastrowid

            con.execute(
                """
                INSERT INTO trust_events
                (product_id,event_type,severity,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (product_id, "UNVERIFIED_PRODUCT", "MEDIUM", "Produkt noch nicht verifiziert.", now),
            )
        return f"Produkt #{product_id} gespeichert: Verifizierung ausstehend."

    def add_evidence(self, product_id, evidence_type, issuer, reference):
        now = self.now()
        with self.connect() as con:
            product = con.execute(
                "SELECT id FROM products WHERE id=?",
                (product_id,),
            ).fetchone()
            if not product:
                return "Produkt nicht gefunden."

            con.execute(
                """
                INSERT INTO evidence
                (product_id,evidence_type,issuer,reference,created_at)
                VALUES(?,?,?,?,?)
                """,
                (product_id, evidence_type, issuer, reference, now),
            )
            con.execute(
                "UPDATE products SET status='PENDING',updated_at=? WHERE id=?",
                (now, product_id),
            )
        return f"Nachweis für Produkt #{product_id} gespeichert; Verifizierung ausstehend."

    def verify(self, product_id, status, note):
        if status not in STATUSES:
            return f"Ungültiger Status. Erlaubt: {', '.join(sorted(STATUSES))}"

        now = self.now()
        score = TRUST_SCORES[status]
        with self.connect() as con:
            product = con.execute(
                "SELECT id FROM products WHERE id=?",
                (product_id,),
            ).fetchone()
            if not product:
                return "Produkt nicht gefunden."

            con.execute(
                """
                UPDATE products SET status=?,trust_score=?,updated_at=? WHERE id=?
                """,
                (status, score, now, product_id),
            )

            severity = "INFO" if status == "VERIFIED" else "HIGH"
            con.execute(
                """
                INSERT INTO trust_events
                (product_id,event_type,severity,details,created_at)
                VALUES(?,?,?,?,?)
                """,
                (product_id, "STATUS_CHANGE", severity, note or status, now),
            )
        return f"Produkt #{product_id} -> {status}, Vertrauensscore={score}"

    def demo(self):
        self.add_product(
            "Beispiel Original Motoröl",
            "Brand A",
            "Example B2B Supplier",
            "supplier-catalog",
        )
        self.add_evidence(1, "INVOICE", "Example B2B Supplier", "INV-2026-001")
        self.add_evidence(1, "MANUFACTURER_DATA", "Brand A", "CAT-2026-001")
        self.verify(1, "VERIFIED", "Quelle und Belege geprüft.")

        self.add_product(
            "Unverifiziertes Beispielprodukt",
            "Unknown Brand",
            "Unknown Supplier",
            "marketplace",
        )

    def report(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT p.id,p.name,p.brand,p.supplier,p.status,p.trust_score,
                       COUNT(e.id) evidence_count
                FROM products p
                LEFT JOIN evidence e ON e.product_id=p.id
                GROUP BY p.id
                ORDER BY
                  CASE p.status
                    WHEN 'REJECTED' THEN 1
                    WHEN 'DISPUTED' THEN 2
                    WHEN 'UNVERIFIED' THEN 3
                    WHEN 'PENDING' THEN 4
                    ELSE 5 END,
                  p.id
                """
            ).fetchall()

        out = ["=== BUZZARD v15 AUTHENTIZITÄT / VERTRAUEN-BERICHT ==="]
        if not rows:
            out.append("Noch keine Produkte.")
        for row in rows:
            out.append(
                f"- #{row['id']} {row['name']} | Marke={row['brand'] or '-'} | "
                f"Lieferant={row['supplier'] or '-'} | Status={row['status']} | "
                f"Score={row['trust_score']:.0f} | Nachweise={row['evidence_count']}"
            )
        out += [
            "",
            "REGEL:",
            "Ohne VERIFIED markiert das System ein Produkt nicht automatisch als 'original'.",
            "Risikosignale sind keine Fälschungsvorwürfe; menschliche Prüfung kann erforderlich sein.",
        ]
        return "\n".join(out)
