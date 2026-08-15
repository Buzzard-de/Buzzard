import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "buzzard_pim.sqlite3"

SCHEMA = """
CREATE TABLE IF NOT EXISTS products(
 product_id TEXT PRIMARY KEY, parent_product_id TEXT, sku TEXT UNIQUE NOT NULL,
 gtin TEXT, mpn TEXT, brand_id TEXT, manufacturer_id TEXT,
 canonical_category_id TEXT NOT NULL, product_type TEXT, attribute_set_id TEXT,
 status TEXT NOT NULL DEFAULT 'draft', quality_score INTEGER DEFAULT 0,
 completeness_score INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS product_i18n(
 product_id TEXT, language TEXT, title TEXT, short_description TEXT,
 long_description TEXT, seo_title TEXT, seo_description TEXT, slug TEXT,
 PRIMARY KEY(product_id,language));
CREATE TABLE IF NOT EXISTS product_attributes(
 product_id TEXT, attribute_key TEXT, value_json TEXT,
 PRIMARY KEY(product_id,attribute_key));
CREATE TABLE IF NOT EXISTS product_media(
 media_id TEXT PRIMARY KEY, product_id TEXT, media_type TEXT, uri TEXT, sort_order INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS supplier_products(
 supplier_product_id TEXT PRIMARY KEY, supplier_id TEXT, supplier_sku TEXT,
 product_id TEXT, gtin TEXT, mpn TEXT, raw_snapshot_json TEXT,
 status TEXT DEFAULT 'imported', UNIQUE(supplier_id,supplier_sku));
CREATE TABLE IF NOT EXISTS product_relationships(
 product_id TEXT, related_product_id TEXT, relation_type TEXT,
 PRIMARY KEY(product_id,related_product_id,relation_type));
CREATE TABLE IF NOT EXISTS import_runs(
 import_run_id TEXT PRIMARY KEY, supplier_id TEXT, source_type TEXT,
 source_name TEXT, started_at TEXT, finished_at TEXT,
 received_count INTEGER DEFAULT 0, accepted_count INTEGER DEFAULT 0,
 rejected_count INTEGER DEFAULT 0, duplicate_count INTEGER DEFAULT 0, status TEXT);
"""


def connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA)
    return connection


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def create_product(
    sku,
    canonical_category_id,
    gtin=None,
    mpn=None,
    brand_id=None,
    manufacturer_id=None,
    status="draft",
    quality_score=0,
):
    product_id = str(uuid.uuid4())
    now = utc_now()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO products(
              product_id, sku, gtin, mpn, brand_id, manufacturer_id,
              canonical_category_id, status, quality_score, completeness_score,
              created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)
            """,
            (
                product_id,
                sku,
                gtin,
                mpn,
                brand_id,
                manufacturer_id,
                canonical_category_id,
                status,
                quality_score,
                now,
                now,
            ),
        )
    return product_id


def count_products():
    with connect() as connection:
        row = connection.execute("SELECT COUNT(*) AS n FROM products").fetchone()
        return int(row["n"])
