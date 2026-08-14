import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_product_selection_v28.db"
MIN_NET_PROFIT = 0.50


class ProductSelector:
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
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS product_candidates(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    net_profit REAL,
                    demand REAL,
                    price_opportunity REAL,
                    market_opportunity REAL,
                    supplier_score REAL,
                    risk REAL,
                    trust REAL,
                    data_completeness REAL NOT NULL,
                    decision TEXT NOT NULL,
                    score REAL,
                    reasons TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )

    def completeness(self, values):
        return round(sum(value is not None for value in values) / len(values) * 100, 1)

    def evaluate(
        self,
        name,
        category,
        profit,
        demand,
        price,
        market,
        supplier,
        risk,
        trust,
    ):
        del name, category
        vals = [profit, demand, price, market, supplier, risk, trust]
        comp = self.completeness(vals)
        reasons = []

        if profit is not None and profit < MIN_NET_PROFIT:
            return "REJECT", 0, comp, [f"Nettogewinn unter €{MIN_NET_PROFIT:.2f}"]

        if risk is not None and risk >= 80:
            return "HOLD", 0, comp, ["Risiko sehr hoch"]

        if trust is not None and trust < 40:
            return "HOLD", 0, comp, ["Vertrauens-Score zu niedrig"]

        if comp < 70:
            return "REVIEW", None, comp, ["Kritische Daten fehlen"]

        if any(value is None for value in [demand, price, market, supplier, risk, trust]):
            return "REVIEW", None, comp, ["Kritische Daten fehlen"]

        score = (
            demand * 0.22
            + price * 0.12
            + market * 0.18
            + supplier * 0.18
            + (100 - risk) * 0.12
            + trust * 0.10
            + min(100, (profit / 5) * 100) * 0.08
        )
        score = round(max(0, min(100, score)), 1)

        if score >= 80:
            decision = "PRIORITY"
        elif score >= 65:
            decision = "REVIEW"
        else:
            decision = "HOLD"

        if demand is not None and demand >= 80:
            reasons.append("Nachfrage stark")
        if market is not None and market >= 80:
            reasons.append("Marktchance stark")
        if supplier is not None and supplier >= 80:
            reasons.append("Lieferanten-Eignung stark")
        if trust is not None and trust >= 80:
            reasons.append("Vertrauenssignal stark")
        if risk is not None and risk <= 20:
            reasons.append("Risiko niedrig")
        if profit is not None and profit >= 1:
            reasons.append("Nettogewinn ausreichend")

        return decision, score, comp, reasons

    def add_product(
        self,
        name,
        category,
        profit,
        demand,
        price,
        market,
        supplier,
        risk,
        trust,
    ):
        decision, score, comp, reasons = self.evaluate(
            name,
            category,
            profit,
            demand,
            price,
            market,
            supplier,
            risk,
            trust,
        )

        with self.connect() as con:
            con.execute(
                """
                INSERT INTO product_candidates
                (name,category,net_profit,demand,price_opportunity,market_opportunity,
                 supplier_score,risk,trust,data_completeness,decision,score,reasons,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    name,
                    category,
                    profit,
                    demand,
                    price,
                    market,
                    supplier,
                    risk,
                    trust,
                    comp,
                    decision,
                    score,
                    "; ".join(reasons),
                    self.now(),
                ),
            )

        score_text = f"{score:.1f}" if score is not None else "N/A"
        return (
            f"{name} | Entscheidung={decision} | Score={score_text} | "
            f"Daten={comp:.1f}% | Gründe={'; '.join(reasons) or 'Prüfung erforderlich'}"
        )

    def demo(self):
        self.add_product(
            "5W-30 Motoröl",
            "Automotive",
            2.40,
            88,
            84,
            86,
            91,
            12,
            94,
        )
        self.add_product(
            "Beispiel Produkt B",
            "Automotive",
            0.20,
            82,
            75,
            80,
            85,
            18,
            88,
        )
        self.add_product(
            "Beispiel Produkt C",
            "Automotive",
            1.10,
            None,
            70,
            78,
            76,
            20,
            80,
        )
        self.add_product(
            "Beispiel Produkt D",
            "Automotive",
            1.20,
            55,
            60,
            50,
            65,
            88,
            72,
        )

    def report(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT name,category,net_profit,demand,price_opportunity,
                       market_opportunity,supplier_score,risk,trust,
                       data_completeness,decision,score,reasons
                FROM product_candidates
                ORDER BY
                    CASE decision
                      WHEN 'PRIORITY' THEN 1
                      WHEN 'REVIEW' THEN 2
                      WHEN 'HOLD' THEN 3
                      WHEN 'REJECT' THEN 4
                      ELSE 5 END,
                    score DESC
                """
            ).fetchall()

        out = ["=== BUZZARD v28 PRODUCT SELECTION BERICHT ==="]
        if not rows:
            out.append("- Keine Produktkandidaten.")

        for row in rows:
            score = f"{row['score']:.1f}" if row["score"] is not None else "N/A"
            out.append(
                f"- {row['name']} | {row['category']} | Entscheidung={row['decision']} | "
                f"Score={score} | Netto={row['net_profit'] if row['net_profit'] is not None else '-'} | "
                f"Daten={row['data_completeness']:.1f}%"
            )
            out.append(f"  → {row['reasons'] or 'Prüfung erforderlich'}")

        out += [
            "",
            "ENTSCHEIDUNGSLOGIK:",
            "PRIORITY = als Recherche-/Verkaufskandidat priorisieren.",
            "REVIEW = Expertenprüfung erforderlich.",
            "HOLD = wegen kritischer Unsicherheit/Risiko zurückstellen.",
            "REJECT = nach diesen Handelskriterien nicht geeignet.",
            f"Mindest-Nettogewinn-Schwelle: €{MIN_NET_PROFIT:.2f}",
            "Diese Engine trifft keine automatische Einkaufs- oder Rechtskonformitätsentscheidung.",
        ]
        return "\n".join(out)
