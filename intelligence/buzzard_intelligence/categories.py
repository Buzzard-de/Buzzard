import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_category_intelligence_v32.db"

CATEGORIES = [
    "Automotive",
    "Agricultural Machinery",
    "Tools",
    "Garden",
    "Home & Living",
    "Cleaning",
    "Personal Care",
    "Cosmetics",
    "Electronics",
    "Computers",
    "Mobile Accessories",
    "Appliances",
    "Kitchen",
    "Furniture",
    "Lighting",
    "DIY & Hardware",
    "Construction",
    "Industrial Supplies",
    "Workwear",
    "Safety Equipment",
    "Sports",
    "Outdoor",
    "Camping",
    "Bicycles",
    "Baby Products",
    "Toys",
    "Pet Supplies",
    "Office Supplies",
    "School Supplies",
    "Books & Media",
    "Hobby & Crafts",
    "Fashion",
    "Shoes",
    "Bags & Luggage",
    "Jewelry & Accessories",
    "Watches",
    "Beauty Accessories",
    "Health & Wellness",
    "Food",
    "Beverages",
    "Household Consumables",
    "Paper Products",
    "Packaging",
    "Storage & Organization",
    "Home Improvement",
    "Bathroom",
    "Bedroom",
    "Living Room",
    "Laundry",
    "Heating & Cooling",
    "Smart Home",
    "Security",
    "Networking",
    "Audio",
    "TV & Video",
    "Photography",
    "Gaming",
    "Computer Components",
    "Printers & Supplies",
    "Cables & Adapters",
    "Power Tools",
    "Hand Tools",
    "Workshop Equipment",
    "Fasteners",
    "Electrical Supplies",
    "Plumbing",
    "Paint & Decorating",
    "Automotive Fluids & Lubricants",
    "Automotive Tires",
    "Automotive Batteries",
    "Automotive Brakes",
    "Automotive Filters",
    "Automotive Lighting",
    "Automotive Body Parts",
    "Automotive Interior",
    "Automotive Cleaning",
    "Tractor Parts",
    "Harvester Parts",
    "Trailer Parts",
    "Agricultural Tires",
    "Agricultural Equipment",
    "Irrigation",
    "Plant Care",
    "Seeds & Gardening Supplies",
    "Greenhouse Supplies",
    "Outdoor Furniture",
    "Barbecue & Grilling",
    "Travel Accessories",
    "Seasonal Products",
    "Christmas",
    "School Season",
    "Gifts",
    "Pet Food",
    "Pet Care",
    "Office Furniture",
    "Restaurant Supplies",
    "Hotel Supplies",
    "Industrial Safety",
    "Warehouse Equipment",
    "Logistics Supplies",
    "Renewable Energy",
    "Solar Accessories",
    "EV Charging",
    "E-Mobility",
    "Caravan & Camping",
    "Marine Accessories",
    "Motorcycle",
    "Motorcycle Parts",
    "Vehicle Accessories",
    "Car Electronics",
    "Car Care",
    "Tools & Workshop",
    "Lubricants & Chemicals",
    "B2B Supplies",
]


class CategoryIntel:
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
                CREATE TABLE IF NOT EXISTS categories(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    parent TEXT,
                    owned INTEGER NOT NULL DEFAULT 0,
                    priority REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS category_signals(
                    id INTEGER PRIMARY KEY,
                    category_id INTEGER NOT NULL,
                    demand REAL,
                    competition REAL,
                    supplier REAL,
                    margin REAL,
                    risk REAL,
                    opportunity REAL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def seed(self):
        now = self.now()
        with self.connect() as con:
            for name in CATEGORIES:
                con.execute(
                    """
                    INSERT OR IGNORE INTO categories
                    (name,owned,priority,created_at,updated_at)
                    VALUES(?,?,?,?,?)
                    """,
                    (name, 0, 0, now, now),
                )
        return f"{len(CATEGORIES)} Kategorien in den Katalog geschrieben."

    def set_owned(self, category):
        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM categories WHERE lower(name)=lower(?)",
                (category,),
            ).fetchone()
            if not row:
                con.execute(
                    """
                    INSERT INTO categories
                    (name,owned,priority,created_at,updated_at)
                    VALUES(?,?,?,?,?)
                    """,
                    (category, 1, 0, now, now),
                )
                return f"Neue Kategorie angelegt und als vorhanden markiert: {category}"
            con.execute(
                """
                UPDATE categories SET owned=1,updated_at=? WHERE id=?
                """,
                (now, row["id"]),
            )
        return f"Kategorie als vorhanden markiert: {category}"

    def add_signal(self, category, demand, competition, supplier, margin, risk):
        vals = [demand, competition, supplier, margin, risk]
        for value in vals:
            if value is not None and not 0 <= value <= 100:
                return "Alle Signale müssen zwischen 0 und 100 liegen."

        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM categories WHERE lower(name)=lower(?)",
                (category,),
            ).fetchone()
            if not row:
                con.execute(
                    """
                    INSERT INTO categories
                    (name,owned,priority,created_at,updated_at)
                    VALUES(?,?,?,?,?)
                    """,
                    (category, 0, 0, now, now),
                )
                category_id = con.execute("SELECT last_insert_rowid()").fetchone()[0]
            else:
                category_id = row["id"]

            if any(value is None for value in vals):
                opportunity = None
            else:
                opportunity = round(
                    demand * 0.28
                    + (100 - competition) * 0.15
                    + supplier * 0.20
                    + margin * 0.25
                    + (100 - risk) * 0.12,
                    1,
                )

            con.execute(
                """
                INSERT INTO category_signals
                (category_id,demand,competition,supplier,margin,risk,opportunity,created_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    category_id,
                    demand,
                    competition,
                    supplier,
                    margin,
                    risk,
                    opportunity,
                    now,
                ),
            )

            if opportunity is not None:
                con.execute(
                    """
                    UPDATE categories SET priority=?,updated_at=? WHERE id=?
                    """,
                    (opportunity, now, category_id),
                )

        score = f"{opportunity:.1f}" if opportunity is not None else "N/A"
        return f"{category} | Chancen-Score={score}"

    def queue(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT c.name,c.owned,c.priority,
                       s.demand,s.competition,s.supplier,s.margin,s.risk
                FROM categories c
                LEFT JOIN category_signals s ON s.id=(
                    SELECT id FROM category_signals
                    WHERE category_id=c.id ORDER BY id DESC LIMIT 1
                )
                ORDER BY c.priority DESC,c.name
                """
            ).fetchall()

        out = ["=== BUZZARD v32 CATEGORY RESEARCH QUEUE ==="]
        for row in rows:
            status = "VORHANDEN" if row["owned"] else "FEHLEND"
            score = f"{row['priority']:.1f}" if row["priority"] else "0.0"
            out.append(f"- {row['name']} | {status} | Priorität={score}")
        return "\n".join(out)

    def report(self):
        with self.connect() as con:
            total = con.execute("SELECT COUNT(*) n FROM categories").fetchone()["n"]
            owned = con.execute(
                "SELECT COUNT(*) n FROM categories WHERE owned=1"
            ).fetchone()["n"]
            signals = con.execute("SELECT COUNT(*) n FROM category_signals").fetchone()["n"]
            top = con.execute(
                """
                SELECT name,priority,owned
                FROM categories
                ORDER BY priority DESC,name
                LIMIT 20
                """
            ).fetchall()

        out = [
            "=== BUZZARD v32 CATEGORY INTELLIGENCE BERICHT ===",
            f"Kategorien gesamt: {total}",
            f"In Buzzard als vorhanden markiert: {owned}",
            f"Kategorie-Signale: {signals}",
            "",
            "PRIORITÄRE KATEGORIEN",
        ]
        for row in top:
            status = "VORHANDEN" if row["owned"] else "FEHLEND"
            out.append(f"- {row['name']} | Priorität={row['priority']:.1f} | {status}")
        out += [
            "",
            "REGELN:",
            "Kategorieliste ist Forschungs-Universum, kein automatischer Produktkauf.",
            "Fehlende Kategorien gehen zuerst in die Recherche-Warteschlange.",
            "Ohne echte Marktsignale wird keine Kategoriechance als sicher angenommen.",
        ]
        return "\n".join(out)

    def demo(self):
        self.seed()
        self.set_owned("Automotive")
        self.add_signal("Automotive", 90, 70, 85, 80, 20)
        self.add_signal("Tools", 75, 65, 70, 72, 25)
