import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_price_v25.db"


class PriceIntel:
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
                CREATE TABLE IF NOT EXISTS price_observations(
                    id INTEGER PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    seller TEXT NOT NULL,
                    price REAL NOT NULL,
                    currency TEXT NOT NULL,
                    shipping REAL NOT NULL DEFAULT 0,
                    vat_included TEXT,
                    source TEXT NOT NULL,
                    observed_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS price_signals(
                    id INTEGER PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    seller TEXT,
                    signal_type TEXT NOT NULL,
                    old_price REAL,
                    new_price REAL,
                    change_pct REAL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )

    def add_price(
        self,
        product_id,
        seller,
        price,
        currency,
        source,
        shipping,
        vat_included,
    ):
        if price < 0 or shipping < 0:
            return "Preis/Versand darf nicht negativ sein."

        now = self.now()

        with self.connect() as con:
            prev = con.execute(
                """
                SELECT price FROM price_observations
                WHERE product_id=? AND seller=?
                ORDER BY id DESC LIMIT 1
                """,
                (product_id, seller),
            ).fetchone()

            con.execute(
                """
                INSERT INTO price_observations
                (product_id,seller,price,currency,shipping,vat_included,source,observed_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    product_id,
                    seller,
                    price,
                    currency,
                    shipping,
                    vat_included,
                    source,
                    now,
                ),
            )

            if prev and prev["price"] != 0:
                old = prev["price"]
                pct = (price - old) / old * 100

                if abs(pct) >= 1:
                    signal = "PRICE_DOWN" if pct < 0 else "PRICE_UP"
                    con.execute(
                        """
                        INSERT INTO price_signals
                        (product_id,seller,signal_type,old_price,new_price,
                         change_pct,details,created_at)
                        VALUES(?,?,?,?,?,?,?,?)
                        """,
                        (
                            product_id,
                            seller,
                            signal,
                            old,
                            price,
                            pct,
                            f"Preisänderung {pct:.2f}%",
                            now,
                        ),
                    )

        return f"Preis gespeichert: {product_id} / {seller} = {price:.2f} {currency}"

    def changes(self, product_id):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT seller,old_price,new_price,change_pct,signal_type,created_at
                FROM price_signals
                WHERE product_id=?
                ORDER BY created_at DESC
                """,
                (product_id,),
            ).fetchall()

        if not rows:
            return f"Keine Preisänderungs-Signale für {product_id}."

        out = [f"=== PREISÄNDERUNGEN: {product_id} ==="]
        for row in rows:
            out.append(
                f"- {row['seller']} | {row['signal_type']} | "
                f"{row['old_price']:.2f} -> {row['new_price']:.2f} | "
                f"{row['change_pct']:.2f}% | {row['created_at']}"
            )
        return "\n".join(out)

    def demo(self):
        self.add_price(
            "EAN-123",
            "Store A",
            54.90,
            "EUR",
            "https://example.com/a",
            4.99,
            "yes",
        )
        self.add_price(
            "EAN-123",
            "Store A",
            49.90,
            "EUR",
            "https://example.com/a",
            4.99,
            "yes",
        )
        self.add_price(
            "EAN-123",
            "Store B",
            57.90,
            "EUR",
            "https://example.com/b",
            0,
            "yes",
        )
        self.add_price(
            "EAN-123",
            "Store B",
            61.90,
            "EUR",
            "https://example.com/b",
            0,
            "yes",
        )

    def report(self):
        with self.connect() as con:
            products = con.execute(
                """
                SELECT product_id,currency,
                       MIN(price) min_price,
                       MAX(price) max_price,
                       AVG(price) avg_price,
                       COUNT(*) observations
                FROM price_observations
                GROUP BY product_id,currency
                ORDER BY product_id
                """
            ).fetchall()

            signals = con.execute(
                """
                SELECT product_id,seller,signal_type,old_price,new_price,
                       change_pct,created_at
                FROM price_signals
                ORDER BY created_at DESC
                LIMIT 100
                """
            ).fetchall()

        out = ["=== BUZZARD v25 PRICE INTELLIGENCE BERICHT ===", "", "PRODUKT-PREIS-ÜBERSICHT"]

        for row in products:
            out.append(
                f"- {row['product_id']} | {row['observations']} Beobachtungen | "
                f"min={row['min_price']:.2f} {row['currency']} | "
                f"max={row['max_price']:.2f} {row['currency']} | "
                f"Durchschnitt={row['avg_price']:.2f} {row['currency']}"
            )

        out += ["", "LETZTE PREIS-SIGNALE"]
        for row in signals:
            out.append(
                f"- {row['product_id']} | {row['seller']} | {row['signal_type']} | "
                f"{row['old_price']:.2f}->{row['new_price']:.2f} | "
                f"{row['change_pct']:.2f}%"
            )

        out += [
            "",
            "REGELN:",
            "Beobachtungszeitpunkt und Quelle werden immer gespeichert.",
            "Versand, MwSt., Gutscheine und Varianten müssen bei Vergleichen berücksichtigt werden.",
            "Preis-Intelligence ist keine Verkaufs- oder Gewinngarantie.",
        ]
        return "\n".join(out)
