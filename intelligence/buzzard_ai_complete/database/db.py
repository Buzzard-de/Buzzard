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
def init_db():
    DB_PATH.parent.mkdir(parents=True,exist_ok=True)
    with connect() as c: c.executescript(SCHEMA)
    with connect() as c: c.executescript(COMMERCE_SCHEMA)

COMMERCE_SCHEMA='''
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
 brand TEXT, purchase_price REAL NOT NULL DEFAULT 0, shipping_cost REAL NOT NULL DEFAULT 0,
 marketplace_fee REAL NOT NULL DEFAULT 0, payment_fee REAL NOT NULL DEFAULT 0,
 tax_rate REAL NOT NULL DEFAULT 0, ad_cost REAL NOT NULL DEFAULT 0,
 target_margin REAL NOT NULL DEFAULT 0.07, stock INTEGER NOT NULL DEFAULT 0,
 supplier_id INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);
CREATE TABLE IF NOT EXISTS suppliers(
 id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, country TEXT, dropshipping INTEGER NOT NULL DEFAULT 0,
 white_label INTEGER NOT NULL DEFAULT 0, api_type TEXT, reliability_score REAL NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS supplier_offers(
 id INTEGER PRIMARY KEY, supplier_id INTEGER NOT NULL, sku TEXT NOT NULL, purchase_price REAL NOT NULL,
 shipping_cost REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, lead_time_days REAL NOT NULL DEFAULT 0,
 observed_at TEXT NOT NULL, FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);
CREATE TABLE IF NOT EXISTS competitor_prices(
 id INTEGER PRIMARY KEY, sku TEXT NOT NULL, competitor TEXT NOT NULL, url TEXT NOT NULL,
 price REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR', observed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS market_signals(
 id INTEGER PRIMARY KEY, keyword TEXT NOT NULL, signal_type TEXT NOT NULL, value REAL NOT NULL,
 source TEXT, observed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS product_decisions(
 id INTEGER PRIMARY KEY, sku TEXT NOT NULL, decision TEXT NOT NULL, score REAL NOT NULL,
 net_profit REAL NOT NULL, net_margin REAL NOT NULL, reasons TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY, order_no TEXT UNIQUE NOT NULL, status TEXT NOT NULL, customer_country TEXT NOT NULL,
 currency TEXT NOT NULL DEFAULT 'EUR', subtotal REAL NOT NULL DEFAULT 0, shipping REAL NOT NULL DEFAULT 0,
 fees REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items(
 id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, sku TEXT NOT NULL, quantity INTEGER NOT NULL,
 unit_price REAL NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id)
);
CREATE TABLE IF NOT EXISTS shipping_rates(
 id INTEGER PRIMARY KEY, carrier TEXT NOT NULL, country TEXT NOT NULL, max_weight_kg REAL NOT NULL,
 max_length_cm REAL NOT NULL DEFAULT 0, price REAL NOT NULL, service TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS inventory_movements(
 id INTEGER PRIMARY KEY, sku TEXT NOT NULL, quantity INTEGER NOT NULL, movement_type TEXT NOT NULL,
 reference TEXT, created_at TEXT NOT NULL
);
'''
