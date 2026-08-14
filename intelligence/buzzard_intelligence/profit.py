import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_profit_v16.db"

MIN_NET_PROFIT = 0.50


class ProfitEngine:
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
                CREATE TABLE IF NOT EXISTS product_profit(
                    id INTEGER PRIMARY KEY,
                    product_name TEXT NOT NULL,
                    sale_price REAL NOT NULL,
                    product_cost REAL NOT NULL,
                    shipping REAL NOT NULL,
                    marketplace_fee REAL NOT NULL,
                    payment_fee REAL NOT NULL,
                    advertising REAL NOT NULL,
                    packaging REAL NOT NULL,
                    other_cost REAL NOT NULL,
                    tax_effect REAL NOT NULL,
                    total_cost REAL NOT NULL,
                    net_profit REAL NOT NULL,
                    net_margin REAL NOT NULL,
                    status TEXT NOT NULL,
                    calculated_at TEXT NOT NULL
                )
                """
            )

    def calculate(
        self,
        name,
        sale,
        cost,
        shipping,
        marketplace,
        payment,
        ads,
        packaging,
        other,
        tax,
    ):
        values = [sale, cost, shipping, marketplace, payment, ads, packaging, other, tax]
        if any(value < 0 for value in values):
            return "Negative Kosten/Werte sind nicht erlaubt."

        total = cost + shipping + marketplace + payment + ads + packaging + other + tax
        net = sale - total
        margin = (net / sale * 100) if sale else 0

        if net >= MIN_NET_PROFIT:
            status = "GEEIGNET"
        elif net >= 0:
            status = "GEWINN_ZU_GERING"
        else:
            status = "VERLUST"

        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT INTO product_profit
                (product_name,sale_price,product_cost,shipping,marketplace_fee,
                 payment_fee,advertising,packaging,other_cost,tax_effect,
                 total_cost,net_profit,net_margin,status,calculated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    name,
                    sale,
                    cost,
                    shipping,
                    marketplace,
                    payment,
                    ads,
                    packaging,
                    other,
                    tax,
                    total,
                    net,
                    margin,
                    status,
                    now,
                ),
            )

        return (
            f"{name}\n"
            f"Verkauf: €{sale:.2f}\n"
            f"Gesamtkosten: €{total:.2f}\n"
            f"Nettogewinn: €{net:.2f}\n"
            f"Nettomarge: {margin:.2f}%\n"
            f"Status: {status}"
        )

    def demo(self):
        self.calculate(
            "Beispielprodukt A",
            29.90,
            12,
            4,
            2.99,
            0.90,
            2,
            0.50,
            0.30,
            0,
        )
        self.calculate(
            "Beispielprodukt B",
            9.90,
            7,
            1.50,
            0.80,
            0.40,
            0.50,
            0.20,
            0.20,
            0,
        )

    def report(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT product_name,sale_price,total_cost,net_profit,
                       net_margin,status,calculated_at
                FROM product_profit
                ORDER BY calculated_at DESC
                LIMIT 100
                """
            ).fetchall()

        if not rows:
            return "Noch keine Rentabilitätsberechnungen."

        out = ["=== BUZZARD v16 RENTABILITÄTS-BERICHT ==="]
        for row in rows:
            out.append(
                f"- {row['product_name']} | Verkauf=€{row['sale_price']:.2f} | "
                f"Kosten=€{row['total_cost']:.2f} | Netto=€{row['net_profit']:.2f} | "
                f"Marge={row['net_margin']:.2f}% | {row['status']}"
            )

        out += [
            "",
            f"BUZZARD MINIMUM-NETTOGEWINN-SCHWELLE: €{MIN_NET_PROFIT:.2f}",
            "Dieser Motor liefert mathematische Entscheidungshilfe auf Basis der eingegebenen Kosten.",
            "Kein Ersatz für steuerliche oder rechtliche Beratung.",
        ]
        return "\n".join(out)
