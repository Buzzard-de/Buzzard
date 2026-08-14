import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_risk_v19.db"

SEVERITIES = frozenset({"LOW", "MEDIUM", "HIGH", "CRITICAL"})
STATUSES = frozenset({"OPEN", "UNDER_REVIEW", "VERIFIED", "RESOLVED", "REJECTED"})

RISK_TYPES = frozenset(
    {
        "AUTHENTICITY",
        "SUPPLIER",
        "PRODUCT_SAFETY",
        "MARKET_ACCESS",
        "CUSTOMS",
        "TAX",
        "IP_TRADEMARK",
        "DATA_PRIVACY",
        "DOCUMENTATION",
        "SOURCE_QUALITY",
        "OTHER",
    }
)

SEED_RULES = [
    ("authenticity_check", "Authentizität und Lieferkette müssen verifiziert werden."),
    ("supplier_check", "Lieferantenidentität und Handelsdokumente müssen geprüft werden."),
    (
        "product_safety_check",
        "Produktsicherheits-/Konformitätsanforderungen aus offiziellen Quellen prüfen.",
    ),
    ("market_access_check", "Marktzugangsvoraussetzungen im Zielmarkt verifizieren."),
    ("customs_check", "Import, Zoll und Produktklassifizierung separat prüfen."),
    ("tax_check", "Steuer-/MwSt.-Anwendung aus aktuellen, autorisierten Quellen prüfen."),
    ("ip_check", "Marken-, Design- und IP-Risiken prüfen."),
    ("privacy_check", "Datenschutzpflichten prüfen, wenn personenbezogene Daten verarbeitet werden."),
    ("source_quality_check", "Quelle und Aktualität der Informationen verifizieren."),
]


class RiskEngine:
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
                CREATE TABLE IF NOT EXISTS risks(
                    id INTEGER PRIMARY KEY,
                    entity TEXT NOT NULL,
                    risk_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    details TEXT,
                    source TEXT,
                    country TEXT,
                    status TEXT NOT NULL DEFAULT 'OPEN',
                    priority_score REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS risk_reviews(
                    id INTEGER PRIMARY KEY,
                    risk_id INTEGER NOT NULL,
                    reviewer TEXT NOT NULL,
                    status TEXT NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS risk_rules(
                    id INTEGER PRIMARY KEY,
                    rule_name TEXT NOT NULL UNIQUE,
                    description TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1
                );
                """
            )

            for name, description in SEED_RULES:
                con.execute(
                    """
                    INSERT OR IGNORE INTO risk_rules
                    (rule_name,description)
                    VALUES(?,?)
                    """,
                    (name, description),
                )

    def priority(self, severity, source):
        base = {"LOW": 20, "MEDIUM": 45, "HIGH": 75, "CRITICAL": 100}.get(severity, 45)
        if not source:
            base = min(100, base + 10)
        return float(base)

    def add_risk(self, entity, risk_type, severity, details, source, country):
        risk_type = risk_type.upper()
        severity = severity.upper()

        if risk_type not in RISK_TYPES:
            return f"Ungültiger Risikotyp. Erlaubt: {', '.join(sorted(RISK_TYPES))}"
        if severity not in SEVERITIES:
            return f"Ungültiger Schweregrad. Erlaubt: {', '.join(sorted(SEVERITIES))}"

        now = self.now()
        score = self.priority(severity, source)

        with self.connect() as con:
            cur = con.execute(
                """
                INSERT INTO risks
                (entity,risk_type,severity,details,source,country,status,
                 priority_score,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    entity,
                    risk_type,
                    severity,
                    details,
                    source,
                    country,
                    "OPEN",
                    score,
                    now,
                    now,
                ),
            )
            risk_id = cur.lastrowid

        return f"Risiko #{risk_id} gespeichert | Priorität={score:.0f}/100"

    def verify(self, risk_id, status, note, reviewer="Council Manager"):
        status = status.upper()
        if status not in STATUSES:
            return f"Ungültiger Status. Erlaubt: {', '.join(sorted(STATUSES))}"

        now = self.now()
        with self.connect() as con:
            row = con.execute("SELECT id FROM risks WHERE id=?", (risk_id,)).fetchone()
            if not row:
                return "Risiko nicht gefunden."

            con.execute(
                "UPDATE risks SET status=?,updated_at=? WHERE id=?",
                (status, now, risk_id),
            )
            con.execute(
                """
                INSERT INTO risk_reviews
                (risk_id,reviewer,status,note,created_at)
                VALUES(?,?,?,?,?)
                """,
                (risk_id, reviewer, status, note, now),
            )

        return f"Risiko #{risk_id} -> {status}"

    def demo(self):
        self.add_risk(
            "Beispiel Motoröl",
            "AUTHENTICITY",
            "HIGH",
            "Marken- und Lieferkettenbelege müssen verifiziert werden.",
            "supplier-catalog",
            "DE",
        )
        self.add_risk(
            "Beispielprodukt",
            "PRODUCT_SAFETY",
            "MEDIUM",
            "Produktsicherheitsanforderungen im Zielmarkt prüfen.",
            "",
            "DE",
        )
        self.add_risk(
            "Example Supplier",
            "SUPPLIER",
            "LOW",
            "Unternehmensdaten müssen verifiziert werden.",
            "public-company-source",
            "DE",
        )

    def report(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT id,entity,risk_type,severity,details,source,
                       country,status,priority_score,created_at
                FROM risks
                WHERE status NOT IN ('RESOLVED','REJECTED')
                ORDER BY priority_score DESC,created_at DESC
                """
            ).fetchall()

            counts = con.execute(
                """
                SELECT severity,COUNT(*) n
                FROM risks
                WHERE status NOT IN ('RESOLVED','REJECTED')
                GROUP BY severity
                """
            ).fetchall()

        out = ["=== BUZZARD v19 RISIKO- & COMPLIANCE-BERICHT ===", "", "OFFENE RISIKEN"]

        if not rows:
            out.append("- Keine offenen Risiken.")
        else:
            for row in rows:
                out.append(
                    f"- #{row['id']} [{row['severity']}] {row['risk_type']} | "
                    f"{row['entity']} | Land={row['country'] or '-'} | "
                    f"Priorität={row['priority_score']:.0f} | "
                    f"Status={row['status']} | Quelle={row['source'] or '-'}"
                )
                if row["details"]:
                    out.append(f"  → {row['details']}")

        out += ["", "SCHWEREGRAD-ÜBERSICHT"]
        for row in counts:
            out.append(f"- {row['severity']}: {row['n']}")

        out += [
            "",
            "REGEL:",
            "Risikosignale sind keine rechtlichen Verstöße oder Fälschungsvorwürfe.",
            "Konformität muss über aktuelle offizielle Quellen und ggf. Expertenprüfung bestätigt werden.",
            "Kritische Risiken sollten ohne Klärung keine automatische Handelsfreigabe erhalten.",
        ]
        return "\n".join(out)
