import datetime
import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DB = DATA_DIR / "phone_memory.sqlite3"

SCHEMA = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS customers(
  customer_id TEXT PRIMARY KEY,
  phone_hash TEXT UNIQUE,
  preferred_language TEXT,
  display_name TEXT,
  created_at TEXT,
  updated_at TEXT,
  status TEXT DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS consents(
  consent_id TEXT PRIMARY KEY,
  customer_id TEXT,
  purpose TEXT,
  status TEXT,
  captured_at TEXT,
  source TEXT
);
CREATE TABLE IF NOT EXISTS calls(
  call_id TEXT PRIMARY KEY,
  customer_id TEXT,
  language TEXT,
  started_at TEXT,
  ended_at TEXT,
  outcome TEXT,
  summary TEXT
);
CREATE TABLE IF NOT EXISTS memory_facts(
  fact_id TEXT PRIMARY KEY,
  customer_id TEXT,
  fact_key TEXT,
  fact_value TEXT,
  confidence REAL,
  source_call_id TEXT,
  approved INTEGER,
  created_at TEXT,
  expires_at TEXT,
  UNIQUE(customer_id, fact_key)
);
CREATE TABLE IF NOT EXISTS call_events(
  event_id TEXT PRIMARY KEY,
  call_id TEXT,
  event_type TEXT,
  event_json TEXT,
  created_at TEXT
);
"""


def connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB)
    connection.executescript(SCHEMA)
    return connection


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
