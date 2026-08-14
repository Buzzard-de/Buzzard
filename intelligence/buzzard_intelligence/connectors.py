import sqlite3
from datetime import datetime, timezone
from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_connector_hub_v23.db"
HEALTH = {"UNKNOWN", "HEALTHY", "DEGRADED", "ERROR", "DISABLED"}


class ConnectorHub:
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
                CREATE TABLE IF NOT EXISTS connectors(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    kind TEXT NOT NULL,
                    base_url TEXT NOT NULL,
                    api_key_env TEXT,
                    health TEXT NOT NULL DEFAULT 'UNKNOWN',
                    last_success TEXT,
                    last_error TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS capabilities(
                    id INTEGER PRIMARY KEY,
                    connector_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    direction TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    UNIQUE(connector_id,name,direction)
                );

                CREATE TABLE IF NOT EXISTS connector_events(
                    id INTEGER PRIMARY KEY,
                    connector_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    details TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sync_runs(
                    id INTEGER PRIMARY KEY,
                    connector_id INTEGER NOT NULL,
                    capability TEXT NOT NULL,
                    status TEXT NOT NULL,
                    records_received INTEGER NOT NULL DEFAULT 0,
                    error TEXT,
                    started_at TEXT NOT NULL,
                    finished_at TEXT
                );
                """
            )

    def add_connector(self, name, kind, base_url, key_env):
        now = self.now()
        with self.connect() as con:
            con.execute(
                """
                INSERT OR REPLACE INTO connectors
                (name,kind,base_url,api_key_env,health,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (name, kind, base_url, key_env, "UNKNOWN", now, now),
            )
        return f"Connector gespeichert: {name}"

    def add_capability(self, connector, name, direction):
        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM connectors WHERE name=?",
                (connector,),
            ).fetchone()
            if not row:
                return "Connector nicht gefunden."
            con.execute(
                """
                INSERT OR REPLACE INTO capabilities
                (connector_id,name,direction,enabled,created_at)
                VALUES(?,?,?,?,?)
                """,
                (row["id"], name, direction, 1, now),
            )
        return f"{connector}: {name} ({direction})"

    def set_health(self, connector, status, note=""):
        status = status.upper()
        if status not in HEALTH:
            return "Ungültiger Gesundheitsstatus: " + ", ".join(sorted(HEALTH))
        now = self.now()
        with self.connect() as con:
            row = con.execute(
                "SELECT id FROM connectors WHERE name=?",
                (connector,),
            ).fetchone()
            if not row:
                return "Connector nicht gefunden."

            if status == "HEALTHY":
                con.execute(
                    """
                    UPDATE connectors
                    SET health=?,last_success=?,last_error=NULL,updated_at=?
                    WHERE id=?
                    """,
                    (status, now, now, row["id"]),
                )
            elif status == "ERROR":
                con.execute(
                    """
                    UPDATE connectors
                    SET health=?,last_error=?,updated_at=?
                    WHERE id=?
                    """,
                    (status, note, now, row["id"]),
                )
            else:
                con.execute(
                    """
                    UPDATE connectors SET health=?,updated_at=? WHERE id=?
                    """,
                    (status, now, row["id"]),
                )

            con.execute(
                """
                INSERT INTO connector_events
                (connector_id,event_type,details,created_at)
                VALUES(?,?,?,?)
                """,
                (row["id"], "HEALTH_CHANGE", note or status, now),
            )
        return f"{connector} -> {status}"

    def demo(self):
        self.add_connector(
            "Example Supplier API",
            "supplier",
            "https://api.example.com",
            "BUZZARD_EXAMPLE_SUPPLIER_KEY",
        )
        for cap in [
            ("products", "inbound"),
            ("prices", "inbound"),
            ("inventory", "inbound"),
            ("orders", "outbound"),
            ("tracking", "inbound"),
        ]:
            self.add_capability("Example Supplier API", *cap)
        self.set_health("Example Supplier API", "HEALTHY", "Demo-Connector.")

        self.add_connector(
            "Example Marketplace API",
            "marketplace",
            "https://market.example.com/api",
            "BUZZARD_EXAMPLE_MARKET_KEY",
        )
        self.add_capability("Example Marketplace API", "products", "outbound")
        self.add_capability("Example Marketplace API", "orders", "inbound")
        self.set_health("Example Marketplace API", "UNKNOWN")

    def report(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT c.id,c.name,c.kind,c.base_url,c.api_key_env,c.health,
                       COUNT(cap.id) capability_count
                FROM connectors c
                LEFT JOIN capabilities cap ON cap.connector_id=c.id
                GROUP BY c.id
                ORDER BY c.name
                """
            ).fetchall()

            caps = con.execute(
                """
                SELECT c.name connector,cap.name capability,cap.direction
                FROM capabilities cap
                JOIN connectors c ON c.id=cap.connector_id
                ORDER BY c.name,cap.name
                """
            ).fetchall()

        out = ["=== BUZZARD v23 CONNECTOR HUB BERICHT ===", ""]
        if not rows:
            out.append("- Keine Connectors.")
        for row in rows:
            out.append(
                f"- {row['name']} | Typ={row['kind']} | Status={row['health']} | "
                f"Capabilities={row['capability_count']} | key_env={row['api_key_env'] or '-'}"
            )

        out += ["", "CAPABILITIES"]
        for row in caps:
            out.append(
                f"- {row['connector']} | {row['capability']} | {row['direction']}"
            )

        out += [
            "",
            "SICHERHEITSREGEL:",
            "Echte API-Schlüssel werden nicht in der Datenbank oder im Quellcode gespeichert.",
            "Es wird nur der Name der Environment-Variable gespeichert.",
            "Connectors dürfen nur für autorisierte/offizielle API- oder Feed-Verbindungen genutzt werden.",
            "Authentifizierung und Datensatz je Provider in eigenem Adapter umsetzen.",
        ]
        return "\n".join(out)
