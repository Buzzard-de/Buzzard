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
`);

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
