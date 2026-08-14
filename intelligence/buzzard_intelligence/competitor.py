import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_competitor_v14.db"


class CompetitorIntel:
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
                CREATE TABLE IF NOT EXISTS competitors(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    country TEXT,
                    source TEXT NOT NULL,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS competitor_categories(
                    id INTEGER PRIMARY KEY,
                    competitor_id INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    parent_category TEXT,
                    level INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    observed_at TEXT NOT NULL,
                    UNIQUE(competitor_id,category,parent_category)
                );

                CREATE TABLE IF NOT EXISTS competitor_products(
                    id INTEGER PRIMARY KEY,
                    competitor_id INTEGER NOT NULL,
                    category_id INTEGER,
                    name TEXT NOT NULL,
                    brand TEXT,
                    price REAL,
                    currency TEXT,
                    popularity_signal REAL,
                    source TEXT NOT NULL,
                    observed_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS competitor_events(
                    id INTEGER PRIMARY KEY,
                    competitor_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    details TEXT,
                    source TEXT,
                    detected_at TEXT NOT NULL
                );
                """
            )

    def add_competitor(self, name, country, source):
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR IGNORE INTO competitors
                (name,country,source,first_seen,last_seen)
                VALUES(?,?,?,?,?)
                """,
                (name, country, source, now, now),
            )
            con.execute(
                "UPDATE competitors SET last_seen=? WHERE name=?",
                (now, name),
            )
        return f"Wettbewerber/öffentlicher Shop registriert: {name}"

    def add_product(
        self, competitor, category, name, brand, price, currency, popularity, source
    ):
        now = self.now()
        with self.connect() as con:
            comp = con.execute(
                "SELECT id FROM competitors WHERE name=?",
                (competitor,),
            ).fetchone()
            if not comp:
                return "Zuerst Wettbewerber registrieren."

            cat = con.execute(
                """
                SELECT id FROM competitor_categories
                WHERE competitor_id=? AND category=? AND parent_category IS NULL
                """,
                (comp["id"], category),
            ).fetchone()

            if cat:
                category_id = cat["id"]
            else:
                category_id = con.execute(
                    """
                    INSERT INTO competitor_categories
                    (competitor_id,category,parent_category,level,source,observed_at)
                    VALUES(?,?,?,?,?,?)
                    """,
                    (comp["id"], category, None, 1, source, now),
                ).lastrowid

            con.execute(
                """
                INSERT INTO competitor_products
                (competitor_id,category_id,name,brand,price,currency,
                 popularity_signal,source,observed_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    comp["id"],
                    category_id,
                    name,
                    brand,
                    price,
                    currency,
                    popularity,
                    source,
                    now,
                ),
            )

        return f"Öffentliche Produktbeobachtung gespeichert: {name}"

    def demo(self):
        self.add_competitor(
            "Example Automotive Store",
            "DE",
            "https://example.com",
        )
        self.add_competitor(
            "Example Garden Store",
            "DE",
            "https://example.org",
        )
        self.add_product(
            "Example Automotive Store",
            "Automotive",
            "Beispiel Motoröl 5W-30",
            "Brand A",
            54.90,
            "EUR",
            88,
            "https://example.com/product",
        )
        self.add_product(
            "Example Automotive Store",
            "Automotive",
            "Beispiel Bremsbelag",
            "Brand B",
            49.90,
            "EUR",
            76,
            "https://example.com/brake",
        )
        self.add_product(
            "Example Garden Store",
            "Garden",
            "Beispiel Gartenschlauch",
            "Brand C",
            29.90,
            "EUR",
            81,
            "https://example.org/hose",
        )

    def report(self):
        with self.connect() as con:
            competitors = con.execute(
                """
                SELECT id,name,country,source,last_seen
                FROM competitors ORDER BY name
                """
            ).fetchall()

            categories = con.execute(
                """
                SELECT c.name competitor,COUNT(DISTINCT cc.category) categories
                FROM competitors c
                LEFT JOIN competitor_categories cc ON cc.competitor_id=c.id
                GROUP BY c.id
                """
            ).fetchall()

            products = con.execute(
                """
                SELECT c.name competitor,cp.name product,
                       cc.category,cp.brand,cp.price,cp.currency,
                       cp.popularity_signal,cp.source
                FROM competitor_products cp
                JOIN competitors c ON c.id=cp.competitor_id
                LEFT JOIN competitor_categories cc ON cc.id=cp.category_id
                ORDER BY cp.popularity_signal DESC
                LIMIT 50
                """
            ).fetchall()

        out = [
            "=== BUZZARD v14 WETTBEWERBS- / MARKT-INTELLIGENCE-BERICHT ===",
            "",
            "ÖFFENTLICHE WETTBEWERBER / SHOPS",
        ]
        for row in competitors:
            out.append(
                f"- {row['name']} | Land={row['country'] or '-'} | Quelle={row['source']}"
            )

        out += ["", "KATEGORIE-ABDECKUNG"]
        for row in categories:
            out.append(f"- {row['competitor']} | öffentliche Kategorien={row['categories']}")

        out += [
            "",
            "PRODUKT- / PREIS- / POPULARITÄTSSIGNALE",
            "(Popularität ist nur ein Signal, wenn die Quelle es öffentlich veröffentlicht.)",
        ]
        for row in products:
            popularity = (
                row["popularity_signal"]
                if row["popularity_signal"] is not None
                else "-"
            )
            out.append(
                f"- {row['competitor']} | {row['product']} | {row['category']} | "
                f"{row['price'] or '-'} {row['currency'] or ''} | "
                f"Popularität={popularity}"
            )

        out += [
            "",
            "ETHIK / RECHTLICHE REGEL:",
            "Nur legale, öffentliche und zugängliche Informationen werden verwendet.",
            "Keine vertraulichen Geschäftsdaten, keine privaten Daten, kein Umgehen von Zugriffsbeschränkungen.",
        ]
        return "\n".join(out)
