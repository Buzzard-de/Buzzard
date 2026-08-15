import sqlite3
from buzzard_ai_complete.config.settings import DB_PATH
SCHEMA='''
CREATE TABLE IF NOT EXISTS claims(id INTEGER PRIMARY KEY, entity TEXT NOT NULL, claim_text TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'UNVERIFIED', verification_score REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources(id INTEGER PRIMARY KEY, claim_id INTEGER, source_type TEXT NOT NULL, url TEXT NOT NULL, publisher TEXT NOT NULL, published_at TEXT, note TEXT, source_quality REAL NOT NULL, observed_at TEXT NOT NULL, FOREIGN KEY(claim_id) REFERENCES claims(id));
CREATE TABLE IF NOT EXISTS verification_events(id INTEGER PRIMARY KEY, claim_id INTEGER NOT NULL, status TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, FOREIGN KEY(claim_id) REFERENCES claims(id));
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL, assigned_to TEXT, parent_id INTEGER, result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(parent_id) REFERENCES tasks(id));
CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, source TEXT, confidence REAL NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1, valid_from TEXT, valid_to TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(namespace,key));
CREATE TABLE IF NOT EXISTS memory_history(id INTEGER PRIMARY KEY, memory_id INTEGER NOT NULL, namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, source TEXT, confidence REAL NOT NULL, version INTEGER NOT NULL, changed_at TEXT NOT NULL, FOREIGN KEY(memory_id) REFERENCES memory(id));
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, event_type TEXT NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS security_events(id INTEGER PRIMARY KEY, severity TEXT NOT NULL, event_type TEXT NOT NULL, actor TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, title TEXT NOT NULL, report_type TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS agents(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS research_runs(id INTEGER PRIMARY KEY, task_id INTEGER, agent TEXT NOT NULL, query TEXT NOT NULL, url TEXT, status TEXT NOT NULL, result TEXT, started_at TEXT NOT NULL, finished_at TEXT, FOREIGN KEY(task_id) REFERENCES tasks(id));
CREATE TABLE IF NOT EXISTS source_observations(id INTEGER PRIMARY KEY, url TEXT NOT NULL, content_hash TEXT NOT NULL, title TEXT, observed_at TEXT NOT NULL, changed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS api_keys(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, token_hash TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
'''
def connect():
    c=sqlite3.connect(DB_PATH); c.row_factory=sqlite3.Row; c.execute('PRAGMA foreign_keys=ON'); return c
def _legacy_schema(conn):
    try:
        info = conn.execute("PRAGMA table_info(agents)").fetchall()
    except sqlite3.Error:
        return False
    if not info:
        return False
    columns = {row[1]: row[2] for row in info}
    return columns.get("id") == "TEXT" or "namespace" not in {
        row[1] for row in conn.execute("PRAGMA table_info(memory)").fetchall()
    }


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        with connect() as c:
            if _legacy_schema(c):
                DB_PATH.unlink()
    with connect() as c:
        c.executescript(SCHEMA)
