import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_supplier_match_v27.db"


class SupplierMatcher:
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
                    category TEXT NOT NULL,
                    trust REAL,
                    integration REAL,
                    logistics REAL,
                    risk REAL,
                    dropshipping REAL,
                    whitelabel REAL,
                    evidence REAL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS matches(
                    id INTEGER PRIMARY KEY,
                    product TEXT NOT NULL,
                    category TEXT NOT NULL,
                    supplier_id INTEGER NOT NULL,
                    score REAL,
                    data_completeness REAL NOT NULL,
                    status TEXT NOT NULL,
                    reasons TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def completeness(self, values):
        return round(sum(value is not None for value in values) / len(values) * 100, 1)

    def add_supplier(
        self,
        name,
        category,
        trust,
        integration,
        logistics,
        risk,
        dropshipping,
        whitelabel,
        evidence,
    ):
        vals = [
            trust,
            integration,
            logistics,
            risk,
            dropshipping,
            whitelabel,
            evidence,
        ]
        for value in vals:
            if value is not None and not 0 <= value <= 100:
                return "Scores müssen zwischen 0 und 100 liegen."

        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO suppliers
                (name,category,trust,integration,logistics,risk,dropshipping,
                 whitelabel,evidence,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    name,
                    category,
                    trust,
                    integration,
                    logistics,
                    risk,
                    dropshipping,
                    whitelabel,
                    evidence,
                    self.now(),
                ),
            )
        return f"Lieferant gespeichert: {name}"

    def score(self, row, category):
        if row["category"].strip().lower() != category.strip().lower():
            return None, ["Kategorie stimmt nicht überein"]

        vals = [
            row["trust"],
            row["integration"],
            row["logistics"],
            row["risk"],
            row["dropshipping"],
            row["whitelabel"],
            row["evidence"],
        ]
        if any(value is None for value in vals):
            return None, ["Daten unvollständig"]

        score = (
            row["trust"] * 0.25
            + row["integration"] * 0.20
            + row["logistics"] * 0.15
            + (100 - row["risk"]) * 0.15
            + row["dropshipping"] * 0.10
            + row["whitelabel"] * 0.05
            + row["evidence"] * 0.10
        )

        reasons = [
            f"Vertrauen={row['trust']:.0f}",
            f"Integration={row['integration']:.0f}",
            f"Logistik={row['logistics']:.0f}",
            f"Risiko={row['risk']:.0f}",
            f"Dropshipping={row['dropshipping']:.0f}",
            f"White-Label={row['whitelabel']:.0f}",
            f"Nachweise={row['evidence']:.0f}",
        ]
        return round(score, 1), reasons

    def match(self, product, category):
        with self.connect() as con:
            suppliers = con.execute(
                """
                SELECT * FROM suppliers
                WHERE lower(category)=lower(?)
                ORDER BY name
                """,
                (category,),
            ).fetchall()

            con.execute(
                "DELETE FROM matches WHERE product=? AND category=?",
                (product, category),
            )

            results = []
            for supplier in suppliers:
                score, reasons = self.score(supplier, category)
                completeness = self.completeness(
                    [
                        supplier["trust"],
                        supplier["integration"],
                        supplier["logistics"],
                        supplier["risk"],
                        supplier["dropshipping"],
                        supplier["whitelabel"],
                        supplier["evidence"],
                    ]
                )

                if score is None:
                    status = "REVIEW"
                elif score >= 80:
                    status = "TOP_PRIORITY"
                elif score >= 65:
                    status = "GOOD_CANDIDATE"
                else:
                    status = "LOW_PRIORITY"

                con.execute(
                    """
                    INSERT INTO matches
                    (product,category,supplier_id,score,data_completeness,
                     status,reasons,created_at)
                    VALUES(?,?,?,?,?,?,?,?)
                    """,
                    (
                        product,
                        category,
                        supplier["id"],
                        score,
                        completeness,
                        status,
                        "; ".join(reasons),
                        self.now(),
                    ),
                )

                results.append((supplier["name"], score, status, completeness, reasons))

        results.sort(key=lambda item: (item[1] is not None, item[1] or -1), reverse=True)

        if not results:
            return f"Keine Lieferanten für Kategorie {category} registriert."

        out = [f"=== LIEFERANTEN-MATCHING: {product} ==="]
        for name, score, status, comp, reasons in results:
            score_text = f"{score:.1f}" if score is not None else "DATEN UNZUREICHEND"
            out.append(
                f"- {name} | Score={score_text} | {status} | Daten={comp:.1f}%"
            )
            out.append(f"  → {', '.join(reasons)}")
        return "\n".join(out)

    def demo(self):
        self.add_supplier("Supplier A", "Automotive", 92, 94, 88, 10, 95, 90, 92)
        self.add_supplier("Supplier B", "Automotive", 82, 76, 80, 20, 90, 70, 84)
        self.add_supplier("Supplier C", "Automotive", 70, 65, 68, 35, 80, 50, 65)
        self.match("5W-30 Motoröl", "Automotive")

    def report(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT m.product,m.category,s.name,m.score,m.status,
                       m.data_completeness,m.reasons
                FROM matches m
                JOIN suppliers s ON s.id=m.supplier_id
                ORDER BY m.product,m.score DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v27 SUPPLIER MATCHING BERICHT ==="]
        if not rows:
            out.append("- Noch keine Matches.")
        for row in rows:
            score = f"{row['score']:.1f}" if row["score"] is not None else "DATEN UNZUREICHEND"
            out.append(
                f"- {row['product']} | {row['category']} | {row['name']} | "
                f"Score={score} | {row['status']} | Daten={row['data_completeness']:.1f}%"
            )

        out += [
            "",
            "REGELN:",
            "Dieser Score ist Recherche-Priorität, keine Lieferanten-Freigabe.",
            "Lieferanten mit fehlenden Daten werden nicht mit hoher Konfidenz sortiert.",
            "Risiko- und Authentizitätsprüfungen müssen separat erfolgen.",
        ]
        return "\n".join(out)
