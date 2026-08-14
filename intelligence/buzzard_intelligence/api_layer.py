import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = INTELLIGENCE_DIR / "buzzard_intelligence_v5.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "source_schema.json"
DEFAULT_AUTH_ENV = "BUZZARD_API_KEY"


class APILayer:
    MIN_INTERVAL_MINUTES = 60

    def __init__(self, path=None):
        self.path = Path(path or DB_PATH)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "BuzzardIntelligenceResearch/0.1"})

    def connect(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def init(self):
        with self.connect() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS api_sources(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    base_url TEXT NOT NULL UNIQUE,
                    category TEXT NOT NULL,
                    country TEXT,
                    platform TEXT,
                    interval_minutes INTEGER NOT NULL,
                    priority INTEGER NOT NULL DEFAULT 5,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    auth_env TEXT,
                    created_at TEXT NOT NULL,
                    last_test TEXT,
                    status TEXT DEFAULT 'NOT_TESTED',
                    last_error TEXT
                )
                """
            )

    def add_source(
        self,
        name,
        base_url,
        category,
        country,
        platform,
        interval,
        priority,
        auth_env=None,
    ):
        parsed = urlparse(base_url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Nur HTTP/HTTPS-Quellen sind erlaubt.")

        with self.connect() as con:
            con.execute(
                """
                INSERT OR IGNORE INTO api_sources
                (name,base_url,category,country,platform,interval_minutes,
                 priority,auth_env,created_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    name,
                    base_url,
                    category,
                    country,
                    platform,
                    max(self.MIN_INTERVAL_MINUTES, interval),
                    priority,
                    auth_env or DEFAULT_AUTH_ENV,
                    self.now(),
                ),
            )
        return f"API-Quelle gespeichert: {name}"

    def list_sources(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT id,name,base_url,category,country,platform,
                       interval_minutes,priority,enabled,status,auth_env
                FROM api_sources
                ORDER BY priority DESC,id
                """
            ).fetchall()

        if not rows:
            return "Noch keine API-Quellen definiert."

        out = ["=== BUZZARD API-QUELLEN ==="]
        for row in rows:
            out.append(
                f"#{row['id']} | {row['name']} | {row['category']} | "
                f"{row['platform']} | {row['status']} | aktiv={bool(row['enabled'])} | "
                f"auth={row['auth_env'] or '-'} | {row['base_url']}"
            )
        return "\n".join(out)

    def _headers(self, auth_env=None):
        headers = {}
        env_name = auth_env or DEFAULT_AUTH_ENV
        key = os.getenv(env_name)
        if key:
            headers["Authorization"] = f"Bearer {key}"
        return headers

    def test_one(self, source):
        try:
            response = self.session.get(
                source["base_url"],
                headers=self._headers(source["auth_env"]),
                timeout=20,
            )
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if not any(token in content_type for token in ("json", "xml", "csv", "text")):
                raise RuntimeError(f"Unerwarteter Content-Type: {content_type}")

            status = "OK"
            error = ""
        except Exception as exc:
            status = "ERROR"
            error = str(exc)

        with self.connect() as con:
            con.execute(
                """
                UPDATE api_sources
                SET last_test=?,status=?,last_error=?
                WHERE id=?
                """,
                (self.now(), status, error, source["id"]),
            )

        suffix = f" | {error}" if error else ""
        return f"{source['name']}: {status}{suffix}"

    def test_all(self):
        with self.connect() as con:
            rows = con.execute(
                """
                SELECT * FROM api_sources
                WHERE enabled=1
                ORDER BY priority DESC,id
                """
            ).fetchall()

        if not rows:
            return "Keine API-Quellen zum Testen."

        return "\n".join(self.test_one(row) for row in rows)

    def schema_example(self):
        if not SCHEMA_PATH.exists():
            return "Schema-Datei fehlt."
        return SCHEMA_PATH.read_text(encoding="utf-8")
