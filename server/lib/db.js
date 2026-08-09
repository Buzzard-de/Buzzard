const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "buzzard.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'customer',
 name TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS addresses (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 name TEXT NOT NULL,
 line1 TEXT NOT NULL,
 city TEXT NOT NULL,
 postal_code TEXT NOT NULL,
 country_code TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS categories (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sku TEXT UNIQUE NOT NULL,
 name TEXT NOT NULL,
 description TEXT,
 category_id INTEGER,
 price_eur REAL NOT NULL,
 weight_kg REAL NOT NULL DEFAULT 0,
 stock INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS carts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER UNIQUE,
 session_id TEXT UNIQUE,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cart_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 cart_id INTEGER NOT NULL,
 product_id INTEGER NOT NULL,
 quantity INTEGER NOT NULL,
 UNIQUE(cart_id, product_id),
 FOREIGN KEY(cart_id) REFERENCES carts(id) ON DELETE CASCADE,
 FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_number TEXT UNIQUE NOT NULL,
 user_id INTEGER,
 country_code TEXT NOT NULL,
 currency TEXT NOT NULL,
 subtotal REAL NOT NULL,
 shipping REAL NOT NULL,
 tax REAL NOT NULL,
 total REAL NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending_payment',
 shipping_status TEXT NOT NULL DEFAULT 'pending',
 payment_status TEXT NOT NULL DEFAULT 'pending',
 shipping_address TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS order_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER NOT NULL,
 product_id INTEGER NOT NULL,
 sku TEXT NOT NULL,
 name TEXT NOT NULL,
 unit_price_eur REAL NOT NULL,
 quantity INTEGER NOT NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS integration_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_key TEXT UNIQUE NOT NULL,
 type TEXT NOT NULL,
 order_number TEXT,
 provider TEXT,
 status TEXT NOT NULL,
 payload TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS automation_jobs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 job_key TEXT UNIQUE NOT NULL,
 type TEXT NOT NULL,
 order_number TEXT,
 status TEXT NOT NULL DEFAULT 'queued',
 attempts INTEGER NOT NULL DEFAULT 0,
 next_run_at TEXT,
 last_error TEXT,
 payload TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_flow (
 order_number TEXT PRIMARY KEY,
 payment_status TEXT NOT NULL DEFAULT 'pending',
 fulfillment_status TEXT NOT NULL DEFAULT 'pending',
 shipping_status TEXT NOT NULL DEFAULT 'pending',
 supplier_status TEXT NOT NULL DEFAULT 'pending',
 tracking_number TEXT,
 last_error TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS suppliers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code TEXT UNIQUE NOT NULL,
 name TEXT NOT NULL,
 country TEXT,
 feed_type TEXT NOT NULL DEFAULT 'manual',
 feed_url TEXT,
 api_key TEXT,
 active INTEGER NOT NULL DEFAULT 1,
 dropship INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS supplier_products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 supplier_id INTEGER NOT NULL,
 supplier_sku TEXT NOT NULL,
 buzzard_sku TEXT,
 name TEXT,
 cost_eur REAL,
 stock INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(supplier_id, supplier_sku),
 FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sync_runs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 supplier_id INTEGER NOT NULL,
 status TEXT NOT NULL,
 imported INTEGER NOT NULL DEFAULT 0,
 updated INTEGER NOT NULL DEFAULT 0,
 errors INTEGER NOT NULL DEFAULT 0,
 message TEXT,
 started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);
CREATE TABLE IF NOT EXISTS vehicles (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 make TEXT NOT NULL,
 model TEXT NOT NULL,
 year_from INTEGER,
 year_to INTEGER,
 engine TEXT
);
CREATE TABLE IF NOT EXISTS compatibility (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_sku TEXT NOT NULL,
 vehicle_id INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'compatible',
 source TEXT NOT NULL DEFAULT 'tecdoc_adapter',
 UNIQUE(product_sku, vehicle_id),
 FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sync_errors (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 supplier_id INTEGER,
 message TEXT NOT NULL,
 payload TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS product_images (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER NOT NULL,
 url TEXT NOT NULL,
 alt_text TEXT DEFAULT '',
 sort_order INTEGER DEFAULT 0,
 FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS product_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER,
 action TEXT,
 details TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS locales (
 code TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 currency TEXT NOT NULL,
 country_code TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS product_translations (
 product_id INTEGER NOT NULL,
 locale TEXT NOT NULL,
 name TEXT NOT NULL,
 description TEXT DEFAULT '',
 seo_title TEXT DEFAULT '',
 seo_description TEXT DEFAULT '',
 slug TEXT DEFAULT '',
 PRIMARY KEY(product_id, locale),
 FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS category_translations (
 category_id INTEGER NOT NULL,
 locale TEXT NOT NULL,
 name TEXT NOT NULL,
 slug TEXT DEFAULT '',
 PRIMARY KEY(category_id, locale),
 FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS price_overrides (
 product_id INTEGER NOT NULL,
 locale TEXT NOT NULL,
 currency TEXT NOT NULL,
 price REAL NOT NULL,
 PRIMARY KEY(product_id, locale),
 FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS shipping_rates (
 country_code TEXT NOT NULL,
 method TEXT NOT NULL,
 price REAL NOT NULL,
 free_from REAL NOT NULL DEFAULT 0,
 PRIMARY KEY(country_code, method)
);
CREATE TABLE IF NOT EXISTS tax_rates (
 country_code TEXT PRIMARY KEY,
 rate REAL NOT NULL
);
`);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateCatalogSeo() {
  ensureColumn("categories", "slug", "TEXT");
  ensureColumn("categories", "active", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("products", "slug", "TEXT");
  ensureColumn("products", "supplier_cost_eur", "REAL DEFAULT 0");
  ensureColumn("products", "margin_floor", "REAL DEFAULT 0.12");
  ensureColumn("products", "image_url", "TEXT DEFAULT ''");
  ensureColumn("products", "seo_title", "TEXT DEFAULT ''");
  ensureColumn("products", "seo_description", "TEXT DEFAULT ''");
  ensureColumn("products", "updated_at", "TEXT");

  const categories = db.prepare("SELECT id, name, slug FROM categories").all();
  const updateCategorySlug = db.prepare("UPDATE categories SET slug = ? WHERE id = ?");
  for (const row of categories) {
    if (!row.slug) updateCategorySlug.run(slugify(row.name), row.id);
  }

  const products = db.prepare("SELECT id, sku, name, slug, seo_title, seo_description FROM products").all();
  const updateProductMeta = db.prepare(`
    UPDATE products
    SET slug = ?, seo_title = ?, seo_description = ?, updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
    WHERE id = ?
  `);
  for (const row of products) {
    const slug = row.slug || slugify(row.name || row.sku);
    const seoTitle = row.seo_title || `${row.name} | BUZZARD`;
    const seoDescription = row.seo_description || row.name || "";
    updateProductMeta.run(slug, seoTitle, seoDescription, row.id);
  }

  db.exec(`
    UPDATE products
    SET updated_at = COALESCE(updated_at, created_at, datetime('now'))
    WHERE updated_at IS NULL OR updated_at = ''
  `);
}

migrateCatalogSeo();

const DEFAULT_LOCALES = [
  ["de-DE", "Deutsch", "EUR", "DE"],
  ["en-GB", "English", "GBP", "GB"],
  ["fr-FR", "Français", "EUR", "FR"],
  ["nl-NL", "Nederlands", "EUR", "NL"],
  ["pl-PL", "Polski", "PLN", "PL"],
  ["tr-TR", "Türkçe", "TRY", "TR"],
  ["sr-RS", "Srpski", "RSD", "RS"],
  ["bs-BA", "Bosanski", "BAM", "BA"],
  ["sq-AL", "Shqip", "ALL", "AL"],
  ["mk-MK", "Македонски", "MKD", "MK"],
  ["bg-BG", "Български", "BGN", "BG"],
  ["ro-RO", "Română", "RON", "RO"],
  ["el-GR", "Ελληνικά", "EUR", "GR"],
  ["hr-HR", "Hrvatski", "EUR", "HR"],
  ["hu-HU", "Magyar", "HUF", "HU"],
  ["cs-CZ", "Čeština", "CZK", "CZ"],
  ["sk-SK", "Slovenčina", "EUR", "SK"],
  ["sl-SI", "Slovenščina", "EUR", "SI"],
  ["it-IT", "Italiano", "EUR", "IT"],
  ["es-ES", "Español", "EUR", "ES"],
];

const DEFAULT_TAX_RATES = [
  ["DE", 0.19],
  ["FR", 0.2],
  ["NL", 0.21],
  ["PL", 0.23],
  ["GB", 0.2],
  ["TR", 0.2],
  ["RS", 0.2],
  ["BA", 0.17],
  ["AL", 0.2],
  ["MK", 0.18],
  ["BG", 0.2],
  ["RO", 0.21],
  ["GR", 0.24],
  ["HR", 0.25],
  ["HU", 0.27],
  ["CZ", 0.21],
  ["SK", 0.23],
  ["SI", 0.22],
  ["IT", 0.22],
  ["ES", 0.21],
];

function migrateLocalizationFeeds() {
  const insertLocale = db.prepare(
    "INSERT OR IGNORE INTO locales(code, name, currency, country_code) VALUES(?,?,?,?)"
  );
  for (const row of DEFAULT_LOCALES) insertLocale.run(...row);

  const insertTax = db.prepare("INSERT OR IGNORE INTO tax_rates(country_code, rate) VALUES(?,?)");
  for (const row of DEFAULT_TAX_RATES) insertTax.run(...row);

  const shippingCount = db.prepare("SELECT COUNT(*) n FROM shipping_rates").get().n;
  if (shippingCount === 0) {
    const insertShipping = db.prepare(
      "INSERT INTO shipping_rates(country_code, method, price, free_from) VALUES(?,?,?,?)"
    );
    insertShipping.run("DE", "standard", 4.99, 49);
    insertShipping.run("GB", "standard", 6.99, 59);
    insertShipping.run("TR", "standard", 5.99, 49);
  }

  const translationCount = db.prepare("SELECT COUNT(*) n FROM product_translations").get().n;
  if (translationCount === 0) {
    const products = db.prepare("SELECT id, name, description, slug, seo_title, seo_description FROM products LIMIT 3").all();
    const insertTranslation = db.prepare(`
      INSERT OR IGNORE INTO product_translations(product_id, locale, name, description, seo_title, seo_description, slug)
      VALUES(?,?,?,?,?,?,?)
    `);
    for (const product of products) {
      insertTranslation.run(
        product.id,
        "de-DE",
        product.name,
        product.description || "",
        product.seo_title || product.name,
        product.seo_description || product.description || "",
        product.slug || slugify(product.name)
      );
      insertTranslation.run(
        product.id,
        "en-GB",
        `${product.name} (EN)`,
        product.description || "",
        `${product.name} | BUZZARD`,
        product.seo_description || product.description || "",
        product.slug || slugify(product.name)
      );
    }
  }
}

migrateLocalizationFeeds();

function seed() {
  const count = db.prepare("SELECT COUNT(*) n FROM categories").get().n;
  if (count === 0) {
    const insert = db.prepare("INSERT INTO categories(name) VALUES (?)");
    [
      "Automotive",
      "Garden",
      "Home",
      "Pet",
      "Sports",
      "Cleaning",
      "Textile",
      "Electronics",
    ].forEach((name) => insert.run(name));
  }

  const productCount = db.prepare("SELECT COUNT(*) n FROM products").get().n;
  if (productCount === 0) {
    const categories = db.prepare("SELECT id, name FROM categories").all();
    const map = Object.fromEntries(categories.map((row) => [row.name, row.id]));
    const insert = db.prepare(`
      INSERT INTO products (sku, name, description, category_id, price_eur, weight_kg, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const rows = [
      ["BZ-OIL-5W30", "Premium Motoröl 5W-30", "Motoröl für kompatible Fahrzeuge", map.Automotive, 39.9, 5, 48],
      ["BZ-CLEAN-001", "Universal Fahrzeugreiniger 1L", "Fahrzeugpflege", map.Cleaning, 12.9, 1.2, 120],
      ["BZ-GARDEN-001", "Garten Bewässerungsset", "Bewässerung für Garten und Gewächshaus", map.Garden, 49.9, 2.5, 35],
      ["BZ-HOME-001", "Premium Aufbewahrungsbox", "Haushalt und Lagerung", map.Home, 24.9, 1.8, 74],
      ["BZ-PET-001", "Premium Haustierdecke", "Waschbare Haustierdecke", map.Pet, 29.9, 1, 62],
      ["BZ-SPORT-001", "Performance Sportsocken", "Atmungsaktive Sportsocken", map.Sports, 14.9, 0.2, 150],
    ];
    for (const row of rows) insert.run(...row);
  }
}

seed();

function getDatabaseHealth() {
  try {
    const users = db.prepare("SELECT COUNT(*) n FROM users").get().n;
    const products = db.prepare("SELECT COUNT(*) n FROM products").get().n;
    const orders = db.prepare("SELECT COUNT(*) n FROM orders").get().n;
    return {
      enabled: true,
      path: dbPath,
      version: "0.3.0",
      users,
      products,
      orders,
    };
  } catch (error) {
    return {
      enabled: true,
      path: dbPath,
      version: "0.3.0",
      error: error.message,
    };
  }
}

module.exports = {
  db,
  getDatabaseHealth,
};
