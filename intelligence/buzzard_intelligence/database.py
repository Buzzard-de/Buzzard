import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "buzzard_intelligence.db"
SEED_DE_PATH = Path(__file__).resolve().parent / "seed_categories_de.json"


class IntelligenceDB:
    def __init__(self, path=None):
        self.path = Path(path or DB_PATH)

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def init(self):
        with self.connect() as con:
            con.executescript("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id INTEGER,
                level INTEGER NOT NULL DEFAULT 1,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                UNIQUE(name, parent_id)
            );

            CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY,
                url TEXT NOT NULL UNIQUE,
                source_name TEXT,
                country TEXT,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                brand TEXT,
                category_id INTEGER,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS observations (
                id INTEGER PRIMARY KEY,
                product_id INTEGER NOT NULL,
                platform TEXT,
                country TEXT,
                price REAL,
                currency TEXT,
                popularity REAL,
                source_id INTEGER NOT NULL,
                observed_at TEXT NOT NULL
            );
            """)

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def get_or_create_category(self, name, parent_id=None, level=1):
        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM categories WHERE name=? AND parent_id IS ?",
                (name.strip(), parent_id),
            ).fetchone()
            if row:
                con.execute("UPDATE categories SET last_seen=? WHERE id=?", (now, row["id"]))
                return row["id"]
            cur = con.execute(
                "INSERT INTO categories(name,parent_id,level,first_seen,last_seen) VALUES(?,?,?,?,?)",
                (name.strip(), parent_id, level, now, now),
            )
            return cur.lastrowid

    def seed_categories(self, categories):
        for name in categories:
            self.get_or_create_category(name)

    def seed_categories_de(self):
        if not SEED_DE_PATH.exists():
            raise FileNotFoundError(f"Missing {SEED_DE_PATH}")
        categories = json.loads(SEED_DE_PATH.read_text(encoding="utf-8"))
        self.seed_categories(categories)
        return len(categories)

    def get_or_create_source(self, url):
        now = self.now()
        with self.connect() as con:
            row = con.execute("SELECT id FROM sources WHERE url=?", (url,)).fetchone()
            if row:
                con.execute("UPDATE sources SET last_seen=? WHERE id=?", (now, row["id"]))
                return row["id"]
            cur = con.execute(
                "INSERT INTO sources(url,first_seen,last_seen) VALUES(?,?,?)",
                (url, now, now),
            )
            return cur.lastrowid

    def get_or_create_product(self, name, brand, category_id):
        now = self.now()
        brand = brand or ""
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM products WHERE name=? AND IFNULL(brand,'')=? AND category_id=?",
                (name.strip(), brand.strip(), category_id),
            ).fetchone()
            if row:
                con.execute("UPDATE products SET last_seen=? WHERE id=?", (now, row["id"]))
                return row["id"]
            cur = con.execute(
                "INSERT INTO products(name,brand,category_id,first_seen,last_seen) VALUES(?,?,?,?,?)",
                (name.strip(), brand.strip(), category_id, now, now),
            )
            return cur.lastrowid

    def add_observation(
        self,
        category,
        subcategory,
        subsubcategory,
        product,
        brand,
        platform,
        country,
        price,
        currency,
        popularity,
        source_url,
    ):
        parent = self.get_or_create_category(category, None, 1)
        if subcategory:
            parent = self.get_or_create_category(subcategory, parent, 2)
        if subsubcategory:
            parent = self.get_or_create_category(subsubcategory, parent, 3)

        source_id = self.get_or_create_source(source_url)
        product_id = self.get_or_create_product(product, brand, parent)

        with self.connect() as con:
            con.execute(
                """
                INSERT INTO observations
                (product_id,platform,country,price,currency,popularity,source_id,observed_at)
                VALUES(?,?,?,?,?,?,?,?)
            """,
                (
                    product_id,
                    platform,
                    country,
                    price,
                    currency,
                    popularity,
                    source_id,
                    self.now(),
                ),
            )

    def report(self):
        with self.connect() as con:
            cats = con.execute("SELECT COUNT(*) c FROM categories WHERE level=1").fetchone()["c"]
            subs = con.execute("SELECT COUNT(*) c FROM categories WHERE level>1").fetchone()["c"]
            products = con.execute("SELECT COUNT(*) c FROM products").fetchone()["c"]
            obs = con.execute("SELECT COUNT(*) c FROM observations").fetchone()["c"]

            rows = con.execute(
                """
                SELECT c.name category, COUNT(o.id) observations
                FROM categories c
                LEFT JOIN products p ON p.category_id=c.id
                LEFT JOIN observations o ON o.product_id=p.id
                WHERE c.level=1
                GROUP BY c.id
                ORDER BY observations DESC, c.name
                LIMIT 20
            """
            ).fetchall()

        out = [
            "=== BUZZARD INTELLIGENCE REPORT ===",
            f"Main categories: {cats}",
            f"Sub/sub-sub categories: {subs}",
            f"Products: {products}",
            f"Observations: {obs}",
            "",
            "Top main categories by observations:",
        ]
        out += [f"- {r['category']}: {r['observations']} observations" for r in rows]
        return "\n".join(out)

    def changes(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT
                    p.name product,
                    p.brand,
                    o.platform,
                    o.country,
                    o.price,
                    o.currency,
                    o.popularity,
                    o.observed_at,
                    s.url
                FROM observations o
                JOIN products p ON p.id=o.product_id
                JOIN sources s ON s.id=o.source_id
                ORDER BY o.observed_at DESC
                LIMIT 30
            """
            ).fetchall()

        out = ["=== RECENT INTELLIGENCE OBSERVATIONS ==="]
        for r in rows:
            out.append(
                f"- {r['product']} | {r['brand'] or '-'} | "
                f"{r['platform'] or '-'} | {r['country'] or '-'} | "
                f"{r['price'] if r['price'] is not None else '-'} {r['currency'] or ''} | "
                f"popularity={r['popularity'] if r['popularity'] is not None else '-'} | "
                f"{r['observed_at']} | {r['url']}"
            )
        return "\n".join(out)
