import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_supplier_v18.db"

CAPABILITIES = [
    "API",
    "XML",
    "JSON",
    "CSV",
    "Dropshipping",
    "White-label",
    "Blind shipping",
    "eBay integration",
    "Amazon integration",
    "TecDoc",
    "B2B",
    "Invoice",
    "Manufacturer data",
    "Tracking API",
]

INTEGRATION_CAPABILITIES = frozenset(
    {
        "API",
        "XML",
        "JSON",
        "CSV",
        "Dropshipping",
        "White-label",
        "Blind shipping",
        "eBay integration",
        "Amazon integration",
        "TecDoc",
        "Tracking API",
    }
)


class SupplierIntel:
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
                CREATE TABLE IF NOT EXISTS suppliers(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    country TEXT,
                    b2b TEXT,
                    source TEXT NOT NULL,
                    trust_score REAL DEFAULT 0,
                    integration_score REAL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS capabilities(
                    id INTEGER PRIMARY KEY,
                    supplier_id INTEGER NOT NULL,
                    capability TEXT NOT NULL,
                    status TEXT NOT NULL,
                    evidence TEXT,
                    observed_at TEXT NOT NULL,
                    UNIQUE(supplier_id,capability)
                );

                CREATE TABLE IF NOT EXISTS supplier_events(
                    id INTEGER PRIMARY KEY,
                    supplier_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    details TEXT,
                    source TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def add_supplier(self, name, country, b2b, source):
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR IGNORE INTO suppliers
                (name,country,b2b,source,created_at,updated_at)
                VALUES(?,?,?,?,?,?)
                """,
                (name, country, b2b, source, now, now),
            )
            con.execute(
                "UPDATE suppliers SET updated_at=? WHERE name=?",
                (now, name),
            )
        return f"Lieferant gespeichert: {name}"

    def add_capability(self, supplier, capability, status, evidence):
        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM suppliers WHERE name=?",
                (supplier,),
            ).fetchone()
            if not row:
                return "Lieferant nicht gefunden."

            con.execute(
                """
                INSERT OR REPLACE INTO capabilities
                (supplier_id,capability,status,evidence,observed_at)
                VALUES(?,?,?,?,?)
                """,
                (row["id"], capability, status, evidence, now),
            )
            con.execute(
                "UPDATE suppliers SET updated_at=? WHERE id=?",
                (now, row["id"]),
            )

        return f"{supplier}: {capability} -> {status}"

    def recalculate(self):
        with self.connect() as con:
            suppliers = con.execute("SELECT id,b2b FROM suppliers").fetchall()
            for supplier in suppliers:
                rows = con.execute(
                    """
                    SELECT capability,status,evidence
                    FROM capabilities WHERE supplier_id=?
                    """,
                    (supplier["id"],),
                ).fetchall()

                verified = [
                    row
                    for row in rows
                    if str(row["status"]).lower() in ("yes", "verified", "supported")
                ]
                integration = sum(
                    row["capability"] in INTEGRATION_CAPABILITIES for row in verified
                )
                integration_score = min(100, round(integration / 8 * 100, 1))

                trust = 0
                if str(supplier["b2b"]).lower() in ("yes", "verified"):
                    trust += 25
                trust += min(50, len(verified) * 7)
                trust += 25 if any(row["evidence"] for row in verified) else 0
                trust = min(100, trust)

                con.execute(
                    """
                    UPDATE suppliers
                    SET trust_score=?,integration_score=?,updated_at=?
                    WHERE id=?
                    """,
                    (trust, integration_score, self.now(), supplier["id"]),
                )

    def demo(self):
        self.add_supplier(
            "Example Automotive B2B",
            "DE",
            "yes",
            "https://example.com",
        )
        for capability in [
            "B2B",
            "API",
            "XML",
            "Dropshipping",
            "White-label",
            "TecDoc",
            "Invoice",
            "Tracking API",
        ]:
            self.add_capability(
                "Example Automotive B2B",
                capability,
                "verified",
                "https://example.com/docs",
            )

        self.add_supplier(
            "Example General Supplier",
            "DE",
            "unknown",
            "https://example.org",
        )
        self.add_capability("Example General Supplier", "API", "unknown", "")
        self.recalculate()

    def report(self):
        self.recalculate()
        with self.connect() as con:
            suppliers = con.execute(
                """
                SELECT id,name,country,b2b,trust_score,integration_score,source
                FROM suppliers
                ORDER BY integration_score DESC,trust_score DESC,name
                """
            ).fetchall()

            capabilities = con.execute(
                """
                SELECT s.name supplier,COUNT(c.id) capability_count
                FROM suppliers s
                LEFT JOIN capabilities c ON c.supplier_id=s.id
                GROUP BY s.id
                ORDER BY capability_count DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v18 LIEFERANTEN-INTELLIGENCE-BERICHT ===", "", "LIEFERANTEN"]
        for row in suppliers:
            out.append(
                f"- {row['name']} | {row['country'] or '-'} | B2B={row['b2b']} | "
                f"Vertrauen={row['trust_score']:.1f} | Integration={row['integration_score']:.1f} | "
                f"{row['source']}"
            )

        out += ["", "FÄHIGKEITEN-ABDECKUNG"]
        for row in capabilities:
            out.append(
                f"- {row['supplier']} | verifizierte/registrierte Fähigkeiten={row['capability_count']}"
            )

        out += [
            "",
            "REGEL:",
            "Der Score finalisiert keine Lieferantenauswahl automatisch.",
            "API/XML/Feed-Unterstützung muss über offizielle Dokumentation oder verifizierte Lieferanteninfos bestätigt werden.",
            "Bei Integrationen Auth, Rate Limits, Pagination und Feed-Verarbeitung berücksichtigen.",
        ]
        return "\n".join(out)
