import sqlite3

from .memory import MemoryEngine


class Analyzer:
    MIN_OBSERVATIONS_FOR_SIGNAL = 5

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

    def seed(self):
        return self.memory.seed_categories_de()

    def demo(self):
        self.memory.init()
        self.memory.seed_categories_de()
        samples = [
            ("Beispiel Bremsbelag", "Brand A", 49.90, 82),
            ("Beispiel Motoröl 5W-30", "Brand B", 54.90, 91),
            ("Beispiel Wischerblatt", "Brand C", 19.90, 74),
            ("Beispiel Batterie", "Brand D", 129.90, 66),
        ]
        for name, brand, price, popularity in samples:
            self.memory.observe(
                "Automotive",
                "Bremssystem",
                "",
                name,
                brand,
                "demo",
                "DE",
                price,
                "EUR",
                popularity,
                "https://demo.buzzard.local/intelligence",
                "demo",
                0.75,
            )

    def _observation_count(self):
        with self.connect() as con:
            return con.execute("SELECT COUNT(*) c FROM observations").fetchone()["c"]

    def top_observed_products(self, limit=20):
        with self.connect() as con:
            return con.execute(
                """
                SELECT p.name,p.brand,c.name category,
                       COUNT(o.id) observations,
                       AVG(o.popularity) avg_popularity,
                       COUNT(DISTINCT o.source_id) sources
                FROM products p
                JOIN categories c ON c.id=p.category_id
                LEFT JOIN observations o ON o.product_id=p.id
                GROUP BY p.id
                ORDER BY observations DESC, avg_popularity DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    def category_density(self):
        with self.connect() as con:
            return con.execute(
                """
                SELECT c.name,
                       COUNT(DISTINCT p.id) products,
                       COUNT(o.id) observations
                FROM categories c
                LEFT JOIN products p ON p.category_id=c.id
                LEFT JOIN observations o ON o.product_id=p.id
                WHERE c.level=1
                GROUP BY c.id
                ORDER BY observations DESC, products DESC
                """
            ).fetchall()

    def popularity_leaders(self, limit=20):
        with self.connect() as con:
            return con.execute(
                """
                SELECT p.name,p.brand,c.name category,
                       AVG(o.popularity) popularity,
                       COUNT(o.id) observations
                FROM products p
                JOIN categories c ON c.id=p.category_id
                JOIN observations o ON o.product_id=p.id
                WHERE o.popularity IS NOT NULL
                GROUP BY p.id
                HAVING COUNT(o.id) >= 1
                ORDER BY popularity DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    def source_coverage(self):
        with self.connect() as con:
            return con.execute(
                """
                SELECT COUNT(DISTINCT o.source_id) sources,
                       COUNT(DISTINCT o.platform) platforms,
                       COUNT(DISTINCT o.country) countries
                FROM observations o
                """
            ).fetchone()

    def recent_events(self, event_type, limit=10):
        with self.connect() as con:
            return con.execute(
                """
                SELECT p.name product, p.brand, e.old_value, e.new_value, e.detected_at
                FROM events e
                JOIN products p ON p.id=e.product_id
                WHERE e.event_type=?
                ORDER BY e.detected_at DESC
                LIMIT ?
                """,
                (event_type, limit),
            ).fetchall()

    def country_visibility(self, limit=10):
        with self.connect() as con:
            return con.execute(
                """
                SELECT o.country,
                       COUNT(DISTINCT p.id) products,
                       COUNT(o.id) observations
                FROM observations o
                JOIN products p ON p.id=o.product_id
                WHERE o.country IS NOT NULL AND o.country != ''
                GROUP BY o.country
                ORDER BY observations DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    def full_report(self):
        obs_count = self._observation_count()
        top = self.top_observed_products()
        leaders = self.popularity_leaders()
        density = self.category_density()
        coverage = self.source_coverage()
        price_changes = self.recent_events("PRICE_CHANGE")
        popularity_up = self.recent_events("POPULARITY_UP")
        popularity_down = self.recent_events("POPULARITY_DOWN")
        discoveries = self.recent_events("NEW_DISCOVERY")
        countries = self.country_visibility()

        out = [
            "=== BUZZARD INTELLIGENCE v6 — ANALYSEBERICHT ===",
            "",
            "DATENABDECKUNG",
            f"Quellen: {coverage['sources']}",
            f"Plattformen: {coverage['platforms']}",
            f"Länder: {coverage['countries']}",
            f"Beobachtungen gesamt: {obs_count}",
            "",
        ]

        if obs_count < self.MIN_OBSERVATIONS_FOR_SIGNAL:
            out += [
                "WARNUNG: Datenbasis unzureichend für belastbare Signale.",
                f"Mindestens {self.MIN_OBSERVATIONS_FOR_SIGNAL} Beobachtungen empfohlen.",
                "",
            ]

        out += [
            "AM HÄUFIGSTEN BEOBACHTETE PRODUKTE",
            "(Keine Verkaufszahlen — nur Beobachtungsdichte.)",
        ]
        if top:
            for row in top:
                avg_pop = (
                    round(row["avg_popularity"], 1)
                    if row["avg_popularity"] is not None
                    else "-"
                )
                out.append(
                    f"- {row['name']} | {row['category']} | "
                    f"Beobachtungen={row['observations']} | "
                    f"Ø Popularität={avg_pop} | Quellen={row['sources']}"
                )
        else:
            out.append("- Keine Produktdaten vorhanden.")

        out += ["", "PRODUKTE MIT HOHEM POPULARITÄTSSIGNAL"]
        if leaders:
            for row in leaders:
                out.append(
                    f"- {row['name']} | {row['category']} | "
                    f"Popularität={round(row['popularity'], 1)} | "
                    f"Beobachtungen={row['observations']}"
                )
        else:
            out.append("- Keine Popularitätsdaten vorhanden.")

        out += ["", "PREISÄNDERUNGEN (v2 Events)"]
        if price_changes:
            for row in price_changes:
                out.append(
                    f"- {row['product']} | {row['old_value']} -> {row['new_value']} | "
                    f"{row['detected_at']}"
                )
        else:
            out.append("- Keine Preisänderungen erkannt.")

        out += ["", "POPULARITÄT STEIGEND / FALLEND"]
        if popularity_up or popularity_down:
            for row in popularity_up:
                out.append(
                    f"- UP | {row['product']} | {row['old_value']} -> {row['new_value']} | "
                    f"{row['detected_at']}"
                )
            for row in popularity_down:
                out.append(
                    f"- DOWN | {row['product']} | {row['old_value']} -> {row['new_value']} | "
                    f"{row['detected_at']}"
                )
        else:
            out.append("- Keine Popularitätsänderungen erkannt.")

        out += ["", "NEUE ENTDECKUNGEN"]
        if discoveries:
            for row in discoveries[:10]:
                out.append(f"- {row['product']} | {row['detected_at']}")
        else:
            out.append("- Keine neuen Entdeckungen.")

        out += ["", "KATEGORIE-DICHTE (Hauptkategorien)"]
        shown = 0
        for row in density:
            if row["observations"] or row["products"]:
                out.append(
                    f"- {row['name']} | Produkte={row['products']} | "
                    f"Beobachtungen={row['observations']}"
                )
                shown += 1
            if shown >= 20:
                break
        if shown == 0:
            out.append("- Keine Kategoriedaten vorhanden.")

        out += ["", "SICHTBARKEIT NACH LAND"]
        if countries:
            for row in countries:
                out.append(
                    f"- {row['country']} | Produkte={row['products']} | "
                    f"Beobachtungen={row['observations']}"
                )
        else:
            out.append("- Keine Länderdaten vorhanden.")

        out += [
            "",
            "ENTSCHEIDUNGSREGEL",
            "Dieser Bericht trifft keine automatischen Entscheidungen.",
            "Ohne verifizierte Verkaufszahlen wird nicht von 'Bestsellern' gesprochen.",
        ]
        return "\n".join(out)
