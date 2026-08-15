import sqlite3
from pathlib import Path
from buzzard_ai_gesamt.config.settings import DB_PATH

SCHEMA = '''
CREATE TABLE IF NOT EXISTS claims(
 id INTEGER PRIMARY KEY, entity TEXT NOT NULL, claim_text TEXT NOT NULL,
 category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'UNVERIFIED',
 verification_score REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources(
 id INTEGER PRIMARY KEY, claim_id INTEGER NOT NULL, source_type TEXT NOT NULL,
 url TEXT NOT NULL, publisher TEXT NOT NULL, published_at TEXT, note TEXT,
 source_quality REAL NOT NULL, observed_at TEXT NOT NULL,
 FOREIGN KEY(claim_id) REFERENCES claims(id));
CREATE TABLE IF NOT EXISTS verification_events(
 id INTEGER PRIMARY KEY, claim_id INTEGER NOT NULL, status TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(claim_id) REFERENCES claims(id));
CREATE TABLE IF NOT EXISTS tasks(
 id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, priority TEXT NOT NULL,
 status TEXT NOT NULL, assigned_to TEXT, parent_id INTEGER, result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(parent_id) REFERENCES tasks(id));
CREATE TABLE IF NOT EXISTS memory(
 id INTEGER PRIMARY KEY, namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
 source TEXT, confidence REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(namespace,key));
CREATE TABLE IF NOT EXISTS events(
 id INTEGER PRIMARY KEY, event_type TEXT NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS security_events(
 id INTEGER PRIMARY KEY, severity TEXT NOT NULL, event_type TEXT NOT NULL, actor TEXT NOT NULL,
 message TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports(
 id INTEGER PRIMARY KEY, title TEXT NOT NULL, report_type TEXT NOT NULL, content TEXT NOT NULL,
 created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS agents(
 id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
'''

def connect():
    c=sqlite3.connect(DB_PATH)
    c.row_factory=sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c

def init_db():
    with connect() as c:
        c.executescript(SCHEMA)
