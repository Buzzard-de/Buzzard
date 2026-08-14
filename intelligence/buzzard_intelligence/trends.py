import sqlite3
from datetime import datetime, timedelta, timezone

from .memory import MemoryEngine


class TrendEngine:
    MIN_POINTS = 2
    MIN_POINTS_FOR_SCORE = 3
    POPULARITY_TREND_THRESHOLD = 10
    PRICE_TREND_THRESHOLD = 5

    def __init__(self, memory=None):
        self.memory = memory or MemoryEngine()

    @property
    def path(self):
        return self.memory.path

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def init(self):
        self.memory.init()

    def demo(self):
        self.memory.init()
        self.memory.seed_categories_de()
        now = datetime.now(timezone.utc)
        demo_url = "https://demo.buzzard.local/intelligence/trends"

        series = [
            {
                "category": "Automotive",
                "subcategory": "Motoröl",
                "product": "Beispiel Motoröl 5W-30",
                "brand": "Brand A",
                "points": [(30, 45, 60.0), (20, 52, 58.0), (10, 68, 55.0), (3, 81, 51.0)],
            },
            {
                "category": "Garten",
                "subcategory": "Bewässerung",
                "product": "Beispiel Gartenschlauch",
                "brand": "Brand B",
                "points": [(30, 70, 35.0), (20, 67, 36.0), (10, 64, 37.0), (3, 60, 39.0)],
            },
        ]

        for item in series:
            self.memory.observe(
                item["category"],
                item["subcategory"],
                "",
                item["product"],
                item["brand"],
                "demo",
                "DE",
                item["points"][-1][2],
                "EUR",
                item["points"][-1][1],
                demo_url,
                "demo",
                0.75,
            )

            with self.connect() as con:
                product_id = con.execute(
                    """
                    SELECT p.id FROM products p
                    JOIN categories c ON c.id = p.category_id
                    WHERE p.name=? AND c.name=?
                    ORDER BY p.id DESC LIMIT 1
                    """,
                    (item["product"], item["subcategory"]),
                ).fetchone()["id"]

                source_id = con.execute(
                    "SELECT id FROM sources WHERE url=?",
                    (demo_url,),
                ).fetchone()["id"]

                con.execute("DELETE FROM observations WHERE product_id=?", (product_id,))

                for days_ago, popularity, price in item["points"]:
                    observed_at = (now - timedelta(days=days_ago)).isoformat()
                    con.execute(
                        """
                        INSERT INTO observations
                        (product_id,platform,country,price,currency,popularity,
                         confidence,source_id,observed_at)
                        VALUES(?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            product_id,
                            "demo",
                            "DE",
                            price,
                            "EUR",
                            popularity,
                            0.75,
                            source_id,
                            observed_at,
                        ),
                    )

    def product_trend(self, product_id):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT popularity, price, observed_at
                FROM observations
                WHERE product_id=?
                ORDER BY observed_at ASC
                """,
                (product_id,),
            ).fetchall()

        popularity_rows = [row for row in rows if row["popularity"] is not None]
        if len(popularity_rows) < self.MIN_POINTS:
            return None

        first = popularity_rows[0]["popularity"]
        last = popularity_rows[-1]["popularity"]
        delta = last - first
        if delta >= self.POPULARITY_TREND_THRESHOLD:
            direction = "STEIGEND"
        elif delta <= -self.POPULARITY_TREND_THRESHOLD:
            direction = "FALLEND"
        else:
            direction = "STABIL"

        price_delta = None
        price_rows = [row for row in rows if row["price"] is not None]
        if len(price_rows) >= self.MIN_POINTS:
            price_delta = price_rows[-1]["price"] - price_rows[0]["price"]

        return {
            "direction": direction,
            "popularity_delta": delta,
            "price_delta": price_delta,
            "observations": len(popularity_rows),
            "start": popularity_rows[0]["observed_at"],
            "end": popularity_rows[-1]["observed_at"],
        }

    def observation_momentum(self, product_id, window_days=14):
        now = datetime.now(timezone.utc)
        recent_start = (now - timedelta(days=window_days)).isoformat()
        previous_start = (now - timedelta(days=window_days * 2)).isoformat()

        with self.connect() as con:
            recent = con.execute(
                """
                SELECT COUNT(*) c FROM observations
                WHERE product_id=? AND observed_at >= ?
                """,
                (product_id, recent_start),
            ).fetchone()["c"]
            previous = con.execute(
                """
                SELECT COUNT(*) c FROM observations
                WHERE product_id=? AND observed_at >= ? AND observed_at < ?
                """,
                (product_id, previous_start, recent_start),
            ).fetchone()["c"]

        return recent, previous, recent - previous

    def category_coverage_gaps(self, limit=10):
        with self.connect() as con:
            return con.execute(
                """
                SELECT c.name,
                       COUNT(DISTINCT p.id) products,
                       COUNT(o.id) observations
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id
                LEFT JOIN observations o ON o.product_id = p.id
                WHERE c.level = 1
                GROUP BY c.id
                HAVING observations = 0
                ORDER BY c.name
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    def opportunity_score(self, popularity_delta, observations):
        if observations < self.MIN_POINTS_FOR_SCORE:
            return 0.0
        return round(max(0.0, min(100.0, 50 + popularity_delta * 1.5)), 1)

    def report(self):
        with self.connect() as con:
            products = con.execute(
                """
                SELECT p.id, p.name, p.brand, c.name category
                FROM products p
                JOIN categories c ON c.id = p.category_id
                ORDER BY p.name
                """
            ).fetchall()

            discoveries = con.execute(
                """
                SELECT COUNT(*) c FROM events WHERE event_type='NEW_DISCOVERY'
                """
            ).fetchone()["c"]

        out = ["=== BUZZARD INTELLIGENCE v7 — TREND & OPPORTUNITY ===", ""]
        found = False

        for product in products:
            trend = self.product_trend(product["id"])
            if not trend:
                out.append(f"- {product['name']} | DATEN UNZUREICHEND")
                continue

            score = self.opportunity_score(trend["popularity_delta"], trend["observations"])
            recent, previous, momentum = self.observation_momentum(product["id"])
            price_part = (
                f"PreisΔ={trend['price_delta']:+.1f}"
                if trend["price_delta"] is not None
                else "PreisΔ=-"
            )
            found = True
            out.append(
                f"- {product['name']} | {product['category']} | {trend['direction']} | "
                f"PopularitätΔ={trend['popularity_delta']:+.1f} | {price_part} | "
                f"Beobachtungen={trend['observations']} | Momentum={momentum:+d} | "
                f"Opportunity-Score={score}"
            )

        if not found:
            out.append("Keine ausreichenden Zeitreihen-Daten vorhanden.")

        gaps = self.category_coverage_gaps()
        out += ["", "DATENLÜCKEN (Hauptkategorien ohne Beobachtungen)"]
        if gaps:
            for gap in gaps:
                out.append(f"- {gap['name']} | Produkte={gap['products']}")
        else:
            out.append("- Keine offenen Hauptkategorie-Lücken erkannt.")

        out += [
            "",
            f"NEUE ENTDECKUNGEN (v2 Events): {discoveries}",
            "",
            "HINWEIS:",
            "STEIGEND/FALLEND beschreibt nur Änderungen in vorhandenen Beobachtungen.",
            "Opportunity-Score ist keine Verkaufs- oder Investitionsempfehlung.",
            "Bei wenigen Datenpunkten wird kein belastbarer Trend behauptet.",
        ]
        return "\n".join(out)
