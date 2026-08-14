import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .discovery import CategoryDiscovery
from .memory import MemoryEngine

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_intelligence_v9.db"
MIN_OBSERVATIONS = 5


class Reporter:
    SEVERITY_ORDER = """
        CASE severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            ELSE 4
        END
    """

    def __init__(self, memory=None, discovery=None):
        self.memory = memory or MemoryEngine()
        self.discovery = discovery or CategoryDiscovery()
        self.path = DB_PATH

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def now(self):
        return datetime.now(timezone.utc)

    def init(self):
        self.memory.init()
        self.discovery.init()
        with self.connect() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts(
                    id INTEGER PRIMARY KEY,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    details TEXT,
                    entity TEXT,
                    created_at TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    UNIQUE(alert_type, entity)
                )
                """
            )

    def create_alert(self, alert_type, severity, title, details, entity):
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO alerts
                (alert_type,severity,title,details,entity,created_at,acknowledged)
                VALUES(?,?,?,?,?,?,0)
                """,
                (alert_type, severity, title, details, entity, self.now().isoformat()),
            )

    def refresh_alerts(self):
        self.init()
        with self.connect() as con:
            con.execute("DELETE FROM alerts WHERE acknowledged=0")

        mem = sqlite3.connect(self.memory.path)
        mem.row_factory = sqlite3.Row

        for row in mem.execute(
            """
            SELECT p.name product, e.detected_at
            FROM events e JOIN products p ON p.id=e.product_id
            WHERE e.event_type='NEW_DISCOVERY'
            ORDER BY e.detected_at DESC LIMIT 50
            """
        ):
            self.create_alert(
                "NEW_PRODUCT",
                "MEDIUM",
                "Neues Produkt entdeckt",
                f"Quellenbasierte Entdeckung am {row['detected_at']}.",
                row["product"],
            )

        for row in mem.execute(
            """
            SELECT p.name product, e.old_value, e.new_value, e.detected_at
            FROM events e JOIN products p ON p.id=e.product_id
            WHERE e.event_type='PRICE_CHANGE'
            ORDER BY e.detected_at DESC LIMIT 50
            """
        ):
            self.create_alert(
                "PRICE_CHANGE",
                "HIGH",
                "Preisänderung erkannt",
                f"{row['old_value']} -> {row['new_value']} ({row['detected_at']}).",
                row["product"],
            )

        for row in mem.execute(
            """
            SELECT p.name product, e.event_type, e.old_value, e.new_value, e.detected_at
            FROM events e JOIN products p ON p.id=e.product_id
            WHERE e.event_type IN ('POPULARITY_UP','POPULARITY_DOWN')
            ORDER BY e.detected_at DESC LIMIT 50
            """
        ):
            severity = "HIGH" if row["event_type"] == "POPULARITY_UP" else "MEDIUM"
            direction = "steigend" if row["event_type"] == "POPULARITY_UP" else "fallend"
            self.create_alert(
                "TREND",
                severity,
                f"Popularität {direction}",
                f"{row['old_value']} -> {row['new_value']} ({row['detected_at']}).",
                row["product"],
            )

        obs_count = mem.execute("SELECT COUNT(*) c FROM observations").fetchone()["c"]
        mem.close()

        if obs_count < MIN_OBSERVATIONS:
            self.create_alert(
                "DATA_GAP",
                "MEDIUM",
                "Datenbasis unzureichend",
                f"Nur {obs_count} Beobachtungen — mindestens {MIN_OBSERVATIONS} empfohlen.",
                "global",
            )

        disc = sqlite3.connect(self.discovery.path)
        disc.row_factory = sqlite3.Row
        for row in disc.execute(
            """
            SELECT name, parent_name, source, discovered_at
            FROM category_candidates
            WHERE status='NEW'
            ORDER BY discovered_at DESC LIMIT 50
            """
        ):
            entity = f"{row['parent_name'] or '-'}>{row['name']}"
            self.create_alert(
                "NEW_CATEGORY",
                "MEDIUM",
                "Neues Kategorie-Signal",
                f"Quelle: {row['source']} ({row['discovered_at']}).",
                entity,
            )

        for row in disc.execute(
            """
            SELECT category_name, source, detected_at
            FROM category_events
            WHERE event_type='NEW_CATEGORY_SIGNAL'
            ORDER BY detected_at DESC LIMIT 20
            """
        ):
            self.create_alert(
                "NEW_CATEGORY",
                "LOW",
                "Kategorie-Ereignis",
                f"Quelle: {row['source']} ({row['detected_at']}).",
                row["category_name"],
            )
        disc.close()

        with self.connect() as con:
            return con.execute(
                "SELECT COUNT(*) c FROM alerts WHERE acknowledged=0"
            ).fetchone()["c"]

    def demo(self):
        from .analysis import Analyzer
        from .trends import TrendEngine

        Analyzer(self.memory).demo()
        TrendEngine(self.memory).demo()
        self.discovery.sync_known_categories()
        self.discovery.demo()
        count = self.refresh_alerts()
        return count

    def alerts(self):
        with self.connect() as con:
            rows = con.execute(
                f"""
                SELECT alert_type,severity,title,details,entity,created_at
                FROM alerts
                WHERE acknowledged=0
                ORDER BY {self.SEVERITY_ORDER}, created_at DESC
                """
            ).fetchall()

        if not rows:
            return "Keine aktiven Warnungen."

        out = ["=== BUZZARD INTELLIGENCE WARNUNGEN ==="]
        for row in rows:
            out.append(
                f"[{row['severity']}] {row['title']} | {row['entity'] or '-'} | "
                f"{row['details'] or ''} | {row['created_at']}"
            )
        return "\n".join(out)

    def priority_queue(self):
        with self.connect() as con:
            rows = con.execute(
                f"""
                SELECT alert_type,severity,title,details,entity,created_at
                FROM alerts
                WHERE acknowledged=0
                ORDER BY {self.SEVERITY_ORDER}, created_at DESC
                LIMIT 100
                """
            ).fetchall()

        if not rows:
            return "Keine priorisierten Intelligence-Einträge in der Warteschlange."

        out = ["=== INTELLIGENCE PRIORITÄTS-WARTESCHLANGE ==="]
        for index, row in enumerate(rows, 1):
            out.append(f"{index}. [{row['severity']}] {row['title']} — {row['entity'] or '-'}")
        return "\n".join(out)

    def report(self):
        self.memory.init()
        week_ago = (self.now() - timedelta(days=7)).isoformat()

        with sqlite3.connect(self.memory.path) as mem:
            mem.row_factory = sqlite3.Row
            main_cats = mem.execute(
                "SELECT COUNT(*) c FROM categories WHERE level=1"
            ).fetchone()["c"]
            products = mem.execute("SELECT COUNT(*) c FROM products").fetchone()["c"]
            observations = mem.execute("SELECT COUNT(*) c FROM observations").fetchone()["c"]
            week_obs = mem.execute(
                "SELECT COUNT(*) c FROM observations WHERE observed_at >= ?",
                (week_ago,),
            ).fetchone()["c"]
            sources = mem.execute(
                "SELECT COUNT(DISTINCT source_id) c FROM observations"
            ).fetchone()["c"]
            latest = mem.execute(
                """
                SELECT p.name, p.brand, c.name category, o.price, o.currency,
                       o.popularity, o.observed_at, s.url
                FROM observations o
                JOIN products p ON p.id=o.product_id
                JOIN categories c ON c.id=p.category_id
                LEFT JOIN sources s ON s.id=o.source_id
                ORDER BY o.observed_at DESC
                LIMIT 15
                """
            ).fetchall()

        with self.connect() as con:
            active_alerts = con.execute(
                "SELECT COUNT(*) c FROM alerts WHERE acknowledged=0"
            ).fetchone()["c"]

        with sqlite3.connect(self.discovery.path) as disc:
            disc.row_factory = sqlite3.Row
            candidates = disc.execute(
                "SELECT COUNT(*) c FROM category_candidates WHERE status='NEW'"
            ).fetchone()["c"]

        out = [
            "=== BUZZARD INTELLIGENCE v9 — MANAGEMENT-REPORT ===",
            "",
            "ÜBERSICHT",
            f"Hauptkategorien (Memory): {main_cats}",
            f"Produkte: {products}",
            f"Beobachtungen gesamt: {observations}",
            f"Beobachtungen (7 Tage): {week_obs}",
            f"Quellen: {sources}",
            f"Offene Kategorie-Signale: {candidates}",
            f"Aktive Warnungen: {active_alerts}",
            "",
            "LETZTE BEOBACHTUNGEN",
        ]

        if latest:
            for row in latest:
                out.append(
                    f"- {row['name']} | {row['category']} | "
                    f"{row['price'] if row['price'] is not None else '-'} {row['currency'] or ''} | "
                    f"Popularität={row['popularity'] if row['popularity'] is not None else '-'} | "
                    f"{row['observed_at']}"
                )
        else:
            out.append("- Keine Beobachtungen vorhanden.")

        out += [
            "",
            "NUTZUNG",
            "Warnung = Prüfpriorität, keine automatische Shop-Entscheidung.",
            "Entscheidungen bleiben beim menschlichen Review.",
            "",
            "Befehle: refresh-alerts | alerts | queue | intel-report",
        ]
        return "\n".join(out)
