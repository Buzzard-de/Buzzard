import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .seeds import SEED_CATEGORIES

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_intelligence_v2.db"
MEMORY_JSON = INTELLIGENCE_DIR / "buzzard_memory_snapshot.json"
SEED_DE_PATH = Path(__file__).resolve().parent / "seed_categories_de.json"


class MemoryEngine:
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
            con.executescript("""
            CREATE TABLE IF NOT EXISTS categories(
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id INTEGER,
                level INTEGER NOT NULL,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                UNIQUE(name,parent_id)
            );
            CREATE TABLE IF NOT EXISTS sources(
                id INTEGER PRIMARY KEY,
                url TEXT UNIQUE NOT NULL,
                name TEXT,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS products(
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                brand TEXT,
                category_id INTEGER,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                UNIQUE(name,brand,category_id)
            );
            CREATE TABLE IF NOT EXISTS observations(
                id INTEGER PRIMARY KEY,
                product_id INTEGER NOT NULL,
                platform TEXT,
                country TEXT,
                price REAL,
                currency TEXT,
                popularity REAL,
                confidence REAL NOT NULL,
                source_id INTEGER NOT NULL,
                observed_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events(
                id INTEGER PRIMARY KEY,
                product_id INTEGER,
                event_type TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                detected_at TEXT NOT NULL
            );
            """)

    def category(self, name, parent=None, level=1):
        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM categories WHERE name=? AND parent_id IS ?",
                (name.strip(), parent),
            ).fetchone()
            if row:
                con.execute("UPDATE categories SET last_seen=? WHERE id=?", (now, row["id"]))
                return row["id"]
            return con.execute(
                "INSERT INTO categories(name,parent_id,level,first_seen,last_seen) VALUES(?,?,?,?,?)",
                (name.strip(), parent, level, now, now),
            ).lastrowid

    def seed_categories(self, categories=None):
        items = categories or SEED_CATEGORIES
        for name in items:
            self.category(name)
        return len(items)

    def seed_categories_de(self):
        if not SEED_DE_PATH.exists():
            raise FileNotFoundError(f"Missing {SEED_DE_PATH}")
        categories = json.loads(SEED_DE_PATH.read_text(encoding="utf-8"))
        return self.seed_categories(categories)

    def source(self, url, name):
        now = self.now()
        with self.connect() as con:
            row = con.execute("SELECT id FROM sources WHERE url=?", (url,)).fetchone()
            if row:
                con.execute("UPDATE sources SET last_seen=? WHERE id=?", (now, row["id"]))
                return row["id"]
            return con.execute(
                "INSERT INTO sources(url,name,first_seen,last_seen) VALUES(?,?,?,?)",
                (url, name, now, now),
            ).lastrowid

    def observe(
        self,
        category,
        sub,
        subsub,
        product,
        brand,
        platform,
        country,
        price,
        currency,
        popularity,
        url,
        source_name,
        confidence,
    ):
        parent = self.category(category)
        if sub:
            parent = self.category(sub, parent, 2)
        if subsub:
            parent = self.category(subsub, parent, 3)

        source_id = self.source(url, source_name)
        now = self.now()
        brand = brand or ""

        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM products WHERE name=? AND brand=? AND category_id=?",
                (product.strip(), brand.strip(), parent),
            ).fetchone()

            if row:
                product_id = row["id"]
                previous = con.execute(
                    """
                    SELECT price, popularity FROM observations
                    WHERE product_id=? ORDER BY observed_at DESC LIMIT 1
                    """,
                    (product_id,),
                ).fetchone()

                if previous:
                    if price is not None and previous["price"] is not None and price != previous["price"]:
                        con.execute(
                            """
                            INSERT INTO events
                            (product_id,event_type,old_value,new_value,detected_at)
                            VALUES(?,?,?,?,?)
                            """,
                            (product_id, "PRICE_CHANGE", str(previous["price"]), str(price), now),
                        )

                    if popularity is not None and previous["popularity"] is not None:
                        delta = popularity - previous["popularity"]
                        if abs(delta) >= 5:
                            event_type = "POPULARITY_UP" if delta > 0 else "POPULARITY_DOWN"
                            con.execute(
                                """
                                INSERT INTO events
                                (product_id,event_type,old_value,new_value,detected_at)
                                VALUES(?,?,?,?,?)
                                """,
                                (
                                    product_id,
                                    event_type,
                                    str(previous["popularity"]),
                                    str(popularity),
                                    now,
                                ),
                            )

                con.execute("UPDATE products SET last_seen=? WHERE id=?", (now, product_id))
                status = "BESTEHENDE INFORMATION AKTUALISIERT"
            else:
                product_id = con.execute(
                    """
                    INSERT INTO products(name,brand,category_id,first_seen,last_seen)
                    VALUES(?,?,?,?,?)
                    """,
                    (product.strip(), brand.strip(), parent, now, now),
                ).lastrowid
                con.execute(
                    """
                    INSERT INTO events
                    (product_id,event_type,old_value,new_value,detected_at)
                    VALUES(?,?,?,?,?)
                    """,
                    (product_id, "NEW_DISCOVERY", "", product, now),
                )
                status = "NEUE ENTDECKUNG"

            con.execute(
                """
                INSERT INTO observations
                (product_id,platform,country,price,currency,popularity,confidence,source_id,observed_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    product_id,
                    platform,
                    country,
                    price,
                    currency,
                    popularity,
                    max(0, min(1, confidence)),
                    source_id,
                    now,
                ),
            )

        return f"{status}: {product} | im Speicher gespeichert."

    def report(self):
        with self.connect() as con:
            main_cats = con.execute("SELECT COUNT(*) c FROM categories WHERE level=1").fetchone()["c"]
            sub_cats = con.execute("SELECT COUNT(*) c FROM categories WHERE level>1").fetchone()["c"]
            products = con.execute("SELECT COUNT(*) c FROM products").fetchone()["c"]
            observations = con.execute("SELECT COUNT(*) c FROM observations").fetchone()["c"]
            events = con.execute("SELECT COUNT(*) c FROM events").fetchone()["c"]

        return "\n".join(
            [
                "=== BUZZARD INTELLIGENCE v2 — MEMORY REPORT ===",
                f"Hauptkategorien: {main_cats}",
                f"Unterkategorien: {sub_cats}",
                f"Produkte: {products}",
                f"Beobachtungen: {observations}",
                f"Ereignisse: {events}",
            ]
        )

    def changes(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT e.event_type,e.old_value,e.new_value,e.detected_at,
                       p.name product,p.brand
                FROM events e JOIN products p ON p.id=e.product_id
                ORDER BY e.detected_at DESC LIMIT 50
                """
            ).fetchall()

        if not rows:
            return "Noch keine erkannten Änderungen."

        out = ["=== BUZZARD MEMORY / ÄNDERUNGEN ==="]
        for row in rows:
            out.append(
                f"- {row['event_type']} | {row['product']} | "
                f"{row['brand'] or '-'} | {row['old_value']} -> {row['new_value']} | "
                f"{row['detected_at']}"
            )
        return "\n".join(out)

    def search_memory(self, query):
        q = f"%{query}%"
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT p.name,p.brand,c.name category,p.first_seen,p.last_seen,
                       o.price,o.currency,o.popularity,o.observed_at,s.url
                FROM products p
                JOIN categories c ON c.id=p.category_id
                LEFT JOIN observations o ON o.product_id=p.id
                LEFT JOIN sources s ON s.id=o.source_id
                WHERE p.name LIKE ? OR p.brand LIKE ? OR c.name LIKE ?
                ORDER BY o.observed_at DESC LIMIT 50
                """,
                (q, q, q),
            ).fetchall()

        if not rows:
            return "Keine Treffer im Speicher."

        out = [f"=== BUZZARD MEMORY SUCHE: {query} ==="]
        for row in rows:
            out.append(
                f"- {row['name']} | {row['brand'] or '-'} | {row['category']} | "
                f"{row['price'] if row['price'] is not None else '-'} {row['currency'] or ''} | "
                f"Popularität={row['popularity'] if row['popularity'] is not None else '-'} | "
                f"letzte Beobachtung={row['observed_at']} | Quelle={row['url'] or '-'}"
            )
        return "\n".join(out)

    def export_json(self):
        with self.connect() as con:
            data = {
                "categories": [dict(row) for row in con.execute("SELECT * FROM categories")],
                "sources": [dict(row) for row in con.execute("SELECT * FROM sources")],
                "products": [dict(row) for row in con.execute("SELECT * FROM products")],
                "observations": [dict(row) for row in con.execute("SELECT * FROM observations")],
                "events": [dict(row) for row in con.execute("SELECT * FROM events")],
            }
        MEMORY_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return str(MEMORY_JSON.resolve())
