import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_competitor_v33.db"


class CompetitorMonitor:
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
                    url TEXT NOT NULL,
                    market TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS competitor_categories(
                    id INTEGER PRIMARY KEY,
                    competitor_id INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    product_count INTEGER,
                    url TEXT,
                    observed_at TEXT NOT NULL,
                    UNIQUE(competitor_id,category)
                );

                CREATE TABLE IF NOT EXISTS competitor_products(
                    id INTEGER PRIMARY KEY,
                    competitor_id INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    price REAL,
                    currency TEXT,
                    visibility_signal TEXT,
                    url TEXT,
                    observed_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS competitor_events(
                    id INTEGER PRIMARY KEY,
                    competitor_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    details TEXT NOT NULL,
                    observed_at TEXT NOT NULL
                );
                """
            )

    def add_competitor(self, name, url, market):
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return "Nur http/https-URLs werden akzeptiert."
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO competitors
                (name,url,market,status,created_at,updated_at)
                VALUES(?,?,?,?,?,?)
                """,
                (name, url, market, "ACTIVE", now, now),
            )
        return f"Wettbewerber gespeichert: {name}"

    def get_competitor(self, name):
        with self.connect() as con:
            return con.execute(
                "SELECT * FROM competitors WHERE lower(name)=lower(?)",
                (name,),
            ).fetchone()

    def add_category(self, competitor, category, count, url):
        row = self.get_competitor(competitor)
        if not row:
            return "Wettbewerber nicht gefunden."
        if count < 0:
            return "Produktanzahl darf nicht negativ sein."
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO competitor_categories
                (competitor_id,category,product_count,url,observed_at)
                VALUES(?,?,?,?,?)
                """,
                (row["id"], category, count, url, now),
            )
            con.execute(
                """
                INSERT INTO competitor_events
                (competitor_id,event_type,details,observed_at)
                VALUES(?,?,?,?)
                """,
                (row["id"], "CATEGORY_OBSERVED", f"{category} | Produkte={count}", now),
            )
        return f"{competitor}: Kategorie gespeichert -> {category}"

    def add_product(
        self, competitor, category, name, price, currency, signal, url
    ):
        row = self.get_competitor(competitor)
        if not row:
            return "Wettbewerber nicht gefunden."
        if price is not None and price < 0:
            return "Preis darf nicht negativ sein."
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT INTO competitor_products
                (competitor_id,category,name,price,currency,visibility_signal,url,observed_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (row["id"], category, name, price, currency, signal, url, now),
            )
            con.execute(
                """
                INSERT INTO competitor_events
                (competitor_id,event_type,details,observed_at)
                VALUES(?,?,?,?)
                """,
                (
                    row["id"],
                    "PRODUCT_OBSERVED",
                    f"{category} | {name} | Signal={signal}",
                    now,
                ),
            )
        return f"Wettbewerber-Produkt gespeichert: {name}"

    def changes(self, competitor):
        row = self.get_competitor(competitor)
        if not row:
            return "Wettbewerber nicht gefunden."
        with self.connect() as con:
            categories = con.execute(
                """
                SELECT category,product_count,observed_at
                FROM competitor_categories
                WHERE competitor_id=?
                ORDER BY observed_at DESC
                """,
                (row["id"],),
            ).fetchall()
            events = con.execute(
                """
                SELECT event_type,details,observed_at
                FROM competitor_events
                WHERE competitor_id=?
                ORDER BY observed_at DESC
                LIMIT 30
                """,
                (row["id"],),
            ).fetchall()

        out = [f"=== WETTBEWERBER-ÄNDERUNGSBERICHT: {competitor} ===", "", "LETZTE KATEGORIE-BEOBACHTUNGEN"]
        for cat in categories:
            out.append(
                f"- {cat['category']} | Produkte={cat['product_count']} | {cat['observed_at']}"
            )
        out += ["", "LETZTE EREIGNISSE"]
        for event in events:
            out.append(
                f"- {event['event_type']} | {event['details']} | {event['observed_at']}"
            )
        return "\n".join(out)

    def demo(self):
        self.add_competitor(
            "Example Marketplace",
            "https://example.com",
            "Germany",
        )
        self.add_category(
            "Example Marketplace",
            "Automotive",
            120,
            "https://example.com/auto",
        )
        self.add_category(
            "Example Marketplace",
            "Garden",
            85,
            "https://example.com/garden",
        )
        self.add_product(
            "Example Marketplace",
            "Automotive",
            "Example 5W-30",
            49.90,
            "EUR",
            "featured",
            "https://example.com/5w30",
        )
        self.add_product(
            "Example Marketplace",
            "Automotive",
            "Example Brake Pad",
            79.90,
            "EUR",
            "popular",
            "https://example.com/brake",
        )

    def report(self):
        with self.connect() as con:
            competitors = con.execute(
                """
                SELECT c.name,c.market,c.url,c.status,
                       COUNT(DISTINCT cc.id) category_count,
                       COUNT(DISTINCT cp.id) product_observations
                FROM competitors c
                LEFT JOIN competitor_categories cc ON cc.competitor_id=c.id
                LEFT JOIN competitor_products cp ON cp.competitor_id=c.id
                GROUP BY c.id
                ORDER BY c.name
                """
            ).fetchall()

            categories = con.execute(
                """
                SELECT c.name competitor,cc.category,cc.product_count
                FROM competitor_categories cc
                JOIN competitors c ON c.id=cc.competitor_id
                ORDER BY c.name,cc.product_count DESC
                """
            ).fetchall()

            products = con.execute(
                """
                SELECT c.name competitor,cp.category,cp.name product,
                       cp.price,cp.currency,cp.visibility_signal
                FROM competitor_products cp
                JOIN competitors c ON c.id=cp.competitor_id
                ORDER BY c.name,cp.category,cp.name
                """
            ).fetchall()

        out = ["=== BUZZARD v33 COMPETITOR INTELLIGENCE BERICHT ===", "", "WETTBEWERBER"]
        for row in competitors:
            out.append(
                f"- {row['name']} | Markt={row['market']} | Status={row['status']} | "
                f"Kategorie-Beobachtungen={row['category_count']} | "
                f"Produkt-Beobachtungen={row['product_observations']}"
            )

        out += ["", "KATEGORIE-BEOBACHTUNGEN"]
        for row in categories:
            out.append(
                f"- {row['competitor']} | {row['category']} | Produkte={row['product_count']}"
            )

        out += ["", "PRODUKT-BEOBACHTUNGEN"]
        for row in products:
            price = (
                f"{row['price']:.2f} {row['currency']}"
                if row["price"] is not None
                else "-"
            )
            out.append(
                f"- {row['competitor']} | {row['category']} | {row['product']} | "
                f"Preis={price} | Signal={row['visibility_signal'] or '-'}"
            )

        out += [
            "",
            "REGELN (LEGALE INTELLIGENCE):",
            "Nur öffentliche und legal zugängliche Informationen.",
            "Kein Zugriff auf private Daten, CAPTCHA- oder Login-Umgehung.",
            "Featured/Bestseller-Signale nur wenn die Quelle es öffentlich zeigt.",
            "Beobachtung und Schätzung werden getrennt gehalten.",
        ]
        return "\n".join(out)
