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

  const demoCosts = {
    "BZ-OIL-5W30": [24, 39.9],
    "BZ-CLEAN-001": [7, 12.9],
    "BZ-GARDEN-001": [28, 49.9],
    "BZ-HOME-001": [15, 24.9],
    "BZ-PET-001": [18, 29.9],
    "BZ-SPORT-001": [6, 14.9],
  };
  const restorePrice = db.prepare(
    "UPDATE products SET supplier_cost_eur = ?, price_eur = ? WHERE sku = ? AND (price_eur IS NULL OR price_eur <= 0)"
  );
  for (const [sku, [cost, price]] of Object.entries(demoCosts)) {
    restorePrice.run(cost, price, sku);
  }
}

migrateLocalizationFeeds();

function migrateCustomerCheckout() {
  ensureColumn("addresses", "phone", "TEXT DEFAULT ''");

  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      min_order REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS wishlists (
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, product_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS checkout_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      address_id INTEGER,
      country_code TEXT,
      currency TEXT,
      shipping_method TEXT,
      coupon_code TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS shipping_methods (
      country_code TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      free_from REAL DEFAULT 0,
      PRIMARY KEY(country_code, code)
    );
  `);

  const couponCount = db.prepare("SELECT COUNT(*) n FROM coupons").get().n;
  if (couponCount === 0) {
    const insertCoupon = db.prepare(
      "INSERT INTO coupons(code, type, value, min_order) VALUES(?,?,?,?)"
    );
    insertCoupon.run("WELCOME10", "percent", 10, 30);
    insertCoupon.run("BUZZARD5", "fixed", 5, 50);
  }

  const methodCount = db.prepare("SELECT COUNT(*) n FROM shipping_methods").get().n;
  if (methodCount === 0) {
    const insertMethod = db.prepare(
      "INSERT INTO shipping_methods(country_code, code, name, price, free_from) VALUES(?,?,?,?,?)"
    );
    [
      ["DE", "standard", "DHL Standard", 4.99, 79],
      ["DE", "express", "Express", 9.99, 149],
      ["FR", "standard", "Standard", 8.99, 99],
      ["NL", "standard", "Standard", 7.99, 99],
      ["PL", "standard", "Standard", 29.99, 449],
      ["GB", "standard", "Standard", 9.99, 99],
      ["TR", "standard", "Standard", 5.99, 49],
      ["RS", "standard", "Standard", 6.99, 59],
      ["BA", "standard", "Standard", 6.99, 59],
    ].forEach((row) => insertMethod.run(...row));
  }
}

migrateCustomerCheckout();

function migrateCustomerSupport() {
  ensureColumn("notifications", "channel", "TEXT DEFAULT 'in_app'");
  ensureColumn("notifications", "status", "TEXT DEFAULT 'unread'");
  ensureColumn("notifications", "subject", "TEXT DEFAULT ''");
  ensureColumn("notifications", "body", "TEXT DEFAULT ''");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      order_number TEXT,
      subject TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER,
      sender_type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      carrier TEXT,
      tracking_number TEXT,
      status TEXT,
      location TEXT,
      event_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS support_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
  `);

  const templateCount = db.prepare("SELECT COUNT(*) n FROM support_templates").get().n;
  if (templateCount === 0) {
    const insertTemplate = db.prepare("INSERT INTO support_templates(title, body) VALUES(?,?)");
    insertTemplate.run("Order status", "We are checking the current status of your Buzzard order.");
    insertTemplate.run("Shipping delay", "We are checking the shipment status with the carrier.");
    insertTemplate.run("Return request", "Please provide the order number and the reason for the return.");
  }
}

migrateCustomerSupport();

function migrateCrmLoyalty() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_profiles (
      user_id INTEGER PRIMARY KEY,
      phone TEXT,
      country_code TEXT,
      language TEXT DEFAULT 'de-DE',
      marketing_email INTEGER DEFAULT 0,
      marketing_sms INTEGER DEFAULT 0,
      marketing_whatsapp INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      user_id INTEGER PRIMARY KEY,
      points INTEGER DEFAULT 0,
      lifetime_points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'Bronze',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      points INTEGER NOT NULL,
      reason TEXT,
      reference TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      title TEXT,
      points_cost INTEGER,
      discount_type TEXT,
      discount_value REAL,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS customer_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      rules_json TEXT
    );
    CREATE TABLE IF NOT EXISTS customer_segment_members (
      segment_id INTEGER,
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(segment_id, user_id),
      FOREIGN KEY(segment_id) REFERENCES customer_segments(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      code TEXT,
      discount_type TEXT,
      discount_value REAL,
      status TEXT DEFAULT 'active',
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      cart_key TEXT UNIQUE,
      subtotal REAL,
      currency TEXT DEFAULT 'EUR',
      item_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      recovered_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS recovery_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      abandoned_cart_id INTEGER,
      channel TEXT,
      status TEXT DEFAULT 'queued',
      scheduled_at TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(abandoned_cart_id) REFERENCES abandoned_carts(id) ON DELETE CASCADE
    );
  `);

  const rewardCount = db.prepare("SELECT COUNT(*) n FROM rewards").get().n;
  if (rewardCount === 0) {
    const insertReward = db.prepare(
      "INSERT INTO rewards(code, title, points_cost, discount_type, discount_value) VALUES(?,?,?,?,?)"
    );
    insertReward.run("REWARD5", "5 EUR reward", 500, "fixed", 5);
    insertReward.run("REWARD15", "15 EUR reward", 1200, "fixed", 15);
  }

  const segmentCount = db.prepare("SELECT COUNT(*) n FROM customer_segments").get().n;
  if (segmentCount === 0) {
    const insertSegment = db.prepare(
      "INSERT INTO customer_segments(name, description, rules_json) VALUES(?,?,?)"
    );
    insertSegment.run("New Customers", "First purchase / newly registered", '{"orders":0}');
    insertSegment.run("Repeat Customers", "Customers with repeat purchases", '{"orders_min":2}');
    insertSegment.run("High Value", "High lifetime value customers", '{"lifetime_value_min":500}');
    insertSegment.run("Cart Recovery", "Open abandoned cart", '{"abandoned_cart":true}');
  }
}

migrateCrmLoyalty();

function migrateAnalyticsDashboard() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      country_code TEXT,
      category TEXT,
      product_sku TEXT,
      product_name TEXT,
      revenue REAL,
      cost REAL,
      currency TEXT DEFAULT 'EUR',
      status TEXT DEFAULT 'paid',
      source TEXT DEFAULT 'direct',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      event_type TEXT,
      page TEXT,
      product_sku TEXT,
      source TEXT,
      country_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS analytics_customers (
      user_id INTEGER PRIMARY KEY,
      orders_count INTEGER DEFAULT 0,
      lifetime_value REAL DEFAULT 0,
      first_order_at TEXT,
      last_order_at TEXT,
      country_code TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const orderCount = db.prepare("SELECT COUNT(*) n FROM analytics_orders").get().n;
  if (orderCount === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO analytics_orders(order_number, country_code, category, product_sku, product_name, revenue, cost, source, created_at)
      VALUES(?,?,?,?,?,?,?,?,datetime('now', ?))
    `);
    [
      ["BZ1001", "DE", "Automotive", "OIL-5W30", "Premium Motoröl 5W-30", 79, 45, "google", "-2 days"],
      ["BZ1002", "DE", "Garden", "GARDEN-001", "Garten Bewässerungsset", 119, 68, "direct", "-2 days"],
      ["BZ1003", "FR", "Automotive", "BRAKE-001", "Bremsbelag Set", 149, 91, "google", "-1 days"],
      ["BZ1004", "NL", "Home", "HOME-001", "Home Organizer", 59, 31, "instagram", "-1 days"],
      ["BZ1005", "PL", "Sports", "SPORT-001", "Running Performance Set", 129, 76, "google", "-0 days"],
      ["BZ1006", "DE", "Cleaning", "CLEAN-001", "Universal Fahrzeugreiniger", 39, 19, "direct", "-0 days"],
    ].forEach((row) => insertOrder.run(...row));

    const insertEvent = db.prepare(`
      INSERT INTO analytics_events(session_id, event_type, page, product_sku, source, country_code, created_at)
      VALUES(?,?,?,?,?,?,datetime('now', ?))
    `);
    [
      ["s1", "page_view", "/", "", "google", "DE", "-2 days"],
      ["s2", "product_view", "/product/oil", "OIL-5W30", "google", "DE", "-2 days"],
      ["s3", "add_to_cart", "/product/oil", "OIL-5W30", "google", "DE", "-2 days"],
      ["s4", "checkout_start", "/checkout", "OIL-5W30", "google", "DE", "-2 days"],
      ["s5", "purchase", "/checkout", "OIL-5W30", "google", "DE", "-2 days"],
      ["s6", "page_view", "/", "", "direct", "DE", "-1 days"],
      ["s7", "product_view", "/product/garden", "GARDEN-001", "direct", "DE", "-1 days"],
      ["s8", "add_to_cart", "/product/garden", "GARDEN-001", "direct", "DE", "-1 days"],
      ["s9", "checkout_start", "/checkout", "GARDEN-001", "direct", "DE", "-1 days"],
      ["s10", "purchase", "/checkout", "GARDEN-001", "direct", "DE", "-1 days"],
      ["s11", "page_view", "/", "", "instagram", "NL", "-1 days"],
      ["s12", "product_view", "/product/home", "HOME-001", "instagram", "NL", "-1 days"],
      ["s13", "add_to_cart", "/product/home", "HOME-001", "instagram", "NL", "-1 days"],
      ["s14", "checkout_start", "/checkout", "HOME-001", "instagram", "NL", "-1 days"],
      ["s15", "purchase", "/checkout", "HOME-001", "instagram", "NL", "-1 days"],
      ["s16", "page_view", "/", "", "google", "PL", "-0 days"],
      ["s17", "product_view", "/product/sport", "SPORT-001", "google", "PL", "-0 days"],
      ["s18", "add_to_cart", "/product/sport", "SPORT-001", "google", "PL", "-0 days"],
      ["s19", "checkout_start", "/checkout", "SPORT-001", "google", "PL", "-0 days"],
      ["s20", "purchase", "/checkout", "SPORT-001", "google", "PL", "-0 days"],
    ].forEach((row) => insertEvent.run(...row));
  }
}

migrateAnalyticsDashboard();

function migrateMarketingCenter() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      channel TEXT NOT NULL,
      objective TEXT DEFAULT 'sales',
      status TEXT DEFAULT 'draft',
      budget REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      coupon_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS marketing_campaign_spend (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      spend REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      spend_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS marketing_campaign_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      order_number TEXT,
      revenue REAL,
      currency TEXT DEFAULT 'EUR',
      source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_id, order_number),
      FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS marketing_center_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT,
      campaign TEXT,
      source TEXT,
      medium TEXT,
      country_code TEXT,
      product_sku TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS marketing_provider_connections (
      provider TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      account_label TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const providers = ["google_ads", "meta", "tiktok", "ebay", "amazon", "google_shopping"];
  const insertProvider = db.prepare(
    "INSERT OR IGNORE INTO marketing_provider_connections(provider) VALUES(?)"
  );
  providers.forEach((provider) => insertProvider.run(provider));

  const campaignCount = db.prepare("SELECT COUNT(*) n FROM marketing_campaigns").get().n;
  if (campaignCount === 0) {
    const insertCampaign = db.prepare(`
      INSERT INTO marketing_campaigns(name, channel, objective, status, budget, start_date, end_date, utm_source, utm_medium, utm_campaign, coupon_code)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
    `);
    insertCampaign.run(
      "Summer Europe",
      "google_ads",
      "sales",
      "active",
      5000,
      "2026-08-01",
      "2026-08-31",
      "google",
      "cpc",
      "summer-europe",
      "SUMMER10"
    );
    insertCampaign.run(
      "Social Launch",
      "meta",
      "sales",
      "active",
      2500,
      "2026-08-01",
      "2026-08-31",
      "meta",
      "paid_social",
      "social-launch",
      "WELCOME10"
    );
    insertCampaign.run(
      "Marketplace Push",
      "amazon",
      "sales",
      "active",
      3000,
      "2026-08-01",
      "2026-08-31",
      "amazon",
      "marketplace",
      "marketplace-push",
      ""
    );

    const insertSpend = db.prepare(
      "INSERT INTO marketing_campaign_spend(campaign_id, spend, spend_date) VALUES(?,?,?)"
    );
    insertSpend.run(1, 1650, "2026-08-08");
    insertSpend.run(2, 900, "2026-08-08");
    insertSpend.run(3, 1200, "2026-08-08");

    const insertConversion = db.prepare(
      "INSERT INTO marketing_campaign_conversions(campaign_id, order_number, revenue, source) VALUES(?,?,?,?)"
    );
    insertConversion.run(1, "BZ-MKT-1001", 5200, "google");
    insertConversion.run(1, "BZ-MKT-1002", 1800, "google");
    insertConversion.run(2, "BZ-MKT-1003", 3100, "meta");
    insertConversion.run(3, "BZ-MKT-1004", 4200, "amazon");

    const insertEvent = db.prepare(`
      INSERT INTO marketing_center_events(session_id, event_type, campaign, source, medium, country_code, product_sku)
      VALUES(?,?,?,?,?,?,?)
    `);
    insertEvent.run("mc1", "page_view", "summer-europe", "google", "cpc", "DE", "");
    insertEvent.run("mc2", "page_view", "social-launch", "meta", "paid_social", "DE", "");
    insertEvent.run("mc3", "view_item", "summer-europe", "google", "cpc", "DE", "BZ-OIL-5W30");
    insertEvent.run("mc4", "add_to_cart", "summer-europe", "google", "cpc", "DE", "BZ-OIL-5W30");
  }
}

migrateMarketingCenter();

function migrateMarketplaceHub() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      account_label TEXT DEFAULT '',
      status TEXT DEFAULT 'disconnected',
      last_sync TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace_id INTEGER,
      product_sku TEXT NOT NULL,
      channel_sku TEXT,
      title TEXT,
      price REAL,
      currency TEXT DEFAULT 'EUR',
      stock INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(marketplace_id, product_sku),
      FOREIGN KEY(marketplace_id) REFERENCES marketplace_channels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS marketplace_sync_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace_id INTEGER,
      job_type TEXT NOT NULL,
      entity_key TEXT,
      payload_json TEXT,
      status TEXT DEFAULT 'queued',
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      FOREIGN KEY(marketplace_id) REFERENCES marketplace_channels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS marketplace_channel_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace_id INTEGER,
      external_order_id TEXT,
      internal_order_number TEXT,
      status TEXT DEFAULT 'imported',
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      customer_country TEXT,
      imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(marketplace_id, external_order_id),
      FOREIGN KEY(marketplace_id) REFERENCES marketplace_channels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS marketplace_sku_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace_id INTEGER,
      product_sku TEXT,
      channel_sku TEXT,
      UNIQUE(marketplace_id, product_sku),
      FOREIGN KEY(marketplace_id) REFERENCES marketplace_channels(id) ON DELETE CASCADE
    );
  `);

  const channels = [
    ["amazon", "Amazon"],
    ["ebay", "eBay"],
    ["google_shopping", "Google Shopping"],
    ["tiktok_shop", "TikTok Shop"],
  ];
  const insertChannel = db.prepare(
    "INSERT OR IGNORE INTO marketplace_channels(code, name) VALUES(?, ?)"
  );
  channels.forEach(([code, name]) => insertChannel.run(code, name));

  const listingCount = db.prepare("SELECT COUNT(*) n FROM marketplace_listings").get().n;
  if (listingCount === 0) {
    const ids = Object.fromEntries(
      db.prepare("SELECT id, code FROM marketplace_channels").all().map((row) => [row.code, row.id])
    );
    const insertListing = db.prepare(`
      INSERT INTO marketplace_listings(marketplace_id, product_sku, channel_sku, title, price, currency, stock, status)
      VALUES(?,?,?,?,?,?,?,?)
    `);
    insertListing.run(
      ids.amazon,
      "BZ-OIL-5W30",
      "AMZ-BZ-OIL-5W30",
      "Premium Motoröl 5W-30",
      39.9,
      "EUR",
      48,
      "published"
    );
    insertListing.run(
      ids.ebay,
      "BZ-OIL-5W30",
      "EB-BZ-OIL-5W30",
      "Premium Motoröl 5W-30",
      39.9,
      "EUR",
      48,
      "published"
    );
    insertListing.run(
      ids.google_shopping,
      "BZ-OIL-5W30",
      "BZ-OIL-5W30",
      "Premium Motoröl 5W-30",
      39.9,
      "EUR",
      48,
      "published"
    );

    const insertOrder = db.prepare(`
      INSERT INTO marketplace_channel_orders(marketplace_id, external_order_id, internal_order_number, status, total, currency, customer_country)
      VALUES(?,?,?,?,?,?,?)
    `);
    insertOrder.run(ids.amazon, "AMZ-90001", "BZ-MP-1001", "imported", 79.8, "EUR", "DE");
    insertOrder.run(ids.ebay, "EB-55002", "BZ-MP-1002", "imported", 39.9, "EUR", "FR");
  }
}

migrateMarketplaceHub();

function migrateSupplierHubV16() {
  [
    ["suppliers", "api_enabled", "INTEGER NOT NULL DEFAULT 0"],
    ["suppliers", "xml_enabled", "INTEGER NOT NULL DEFAULT 0"],
    ["suppliers", "tecdoc_enabled", "INTEGER NOT NULL DEFAULT 0"],
    ["suppliers", "white_label_enabled", "INTEGER NOT NULL DEFAULT 0"],
    ["suppliers", "blind_shipping", "INTEGER NOT NULL DEFAULT 0"],
    ["suppliers", "currency", "TEXT DEFAULT 'EUR'"],
    ["suppliers", "rating", "REAL DEFAULT 0"],
    ["suppliers", "lead_time_days", "INTEGER DEFAULT 3"],
    ["suppliers", "status", "TEXT DEFAULT 'active'"],
    ["supplier_products", "product_sku", "TEXT"],
    ["supplier_products", "brand", "TEXT"],
    ["supplier_products", "category", "TEXT"],
    ["supplier_products", "ean", "TEXT"],
    ["supplier_products", "tecdoc_article", "TEXT"],
  ].forEach(([table, column, definition]) => ensureColumn(table, column, definition));

  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_sync_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      job_type TEXT,
      entity_key TEXT,
      status TEXT DEFAULT 'queued',
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS supplier_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      order_number TEXT,
      supplier_order_number TEXT,
      status TEXT DEFAULT 'queued',
      shipping_method TEXT,
      white_label INTEGER DEFAULT 0,
      blind_shipping INTEGER DEFAULT 0,
      payload_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(supplier_id, order_number),
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );
  `);

  db.prepare(`
    UPDATE supplier_products
    SET product_sku = buzzard_sku
    WHERE (product_sku IS NULL OR product_sku = '') AND buzzard_sku IS NOT NULL AND buzzard_sku <> ''
  `).run();

  const demoCount = db.prepare("SELECT COUNT(*) n FROM suppliers WHERE code LIKE 'SUP-%'").get().n;
  if (demoCount === 0) {
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers(code, name, country, feed_type, api_enabled, xml_enabled, tecdoc_enabled, dropship, white_label_enabled, blind_shipping, currency, rating, lead_time_days, status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    insertSupplier.run("SUP-DE-01", "Demo B2B Automotive Supplier", "DE", "api", 1, 1, 1, 1, 1, 1, "EUR", 4.8, 2, "active");
    insertSupplier.run("SUP-DE-02", "Demo Garden & Home Supplier", "DE", "xml", 1, 1, 0, 1, 1, 1, "EUR", 4.5, 3, "active");
    insertSupplier.run("SUP-NL-01", "Demo EU General Supplier", "NL", "manual", 0, 1, 0, 1, 0, 0, "EUR", 4.2, 4, "active");

    const ids = Object.fromEntries(
      db.prepare("SELECT id, code FROM suppliers WHERE code LIKE 'SUP-%'").all().map((row) => [row.code, row.id])
    );
    const insertProduct = db.prepare(`
      INSERT INTO supplier_products(supplier_id, supplier_sku, product_sku, buzzard_sku, name, cost_eur, stock, brand, category, ean, tecdoc_article, active)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,1)
    `);
    if (ids["SUP-DE-01"]) {
      insertProduct.run(
        ids["SUP-DE-01"],
        "SUP-OIL-5W30",
        "BZ-OIL-5W30",
        "BZ-OIL-5W30",
        "Premium Motoröl 5W-30",
        22,
        150,
        "DemoBrand",
        "Automotive",
        "4000000000012",
        "TD-5W30-001"
      );
    }
    if (ids["SUP-DE-02"]) {
      insertProduct.run(
        ids["SUP-DE-02"],
        "SUP-GARDEN-001",
        "BZ-GARDEN-001",
        "BZ-GARDEN-001",
        "Garten Bewässerungsset",
        25,
        80,
        "DemoGarden",
        "Garden",
        "4000000000029",
        ""
      );
    }
  }
}

migrateSupplierHubV16();

function migrateLogisticsFulfillmentV17() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logistics_carriers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      country_scope TEXT DEFAULT 'EU',
      enabled INTEGER DEFAULT 1,
      api_connected INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS logistics_shipping_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carrier_id INTEGER,
      code TEXT,
      name TEXT,
      max_weight_kg REAL DEFAULT 31.5,
      base_price REAL DEFAULT 0,
      delivery_days_min INTEGER DEFAULT 2,
      delivery_days_max INTEGER DEFAULT 5,
      countries TEXT DEFAULT 'DE',
      active INTEGER DEFAULT 1,
      FOREIGN KEY(carrier_id) REFERENCES logistics_carriers(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS logistics_shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      carrier_id INTEGER,
      service_id INTEGER,
      tracking_number TEXT,
      label_url TEXT,
      status TEXT DEFAULT 'pending',
      shipping_cost REAL DEFAULT 0,
      destination_country TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      shipped_at TEXT,
      FOREIGN KEY(carrier_id) REFERENCES logistics_carriers(id),
      FOREIGN KEY(service_id) REFERENCES logistics_shipping_services(id)
    );
    CREATE TABLE IF NOT EXISTS logistics_tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id INTEGER NOT NULL,
      status TEXT,
      location TEXT,
      message TEXT,
      event_time TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS logistics_fulfillment_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT,
      job_type TEXT,
      status TEXT DEFAULT 'queued',
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS logistics_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rma_number TEXT UNIQUE NOT NULL,
      order_number TEXT,
      customer_id INTEGER,
      reason TEXT,
      status TEXT DEFAULT 'requested',
      carrier_code TEXT,
      return_tracking TEXT,
      refund_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const carrierCount = db.prepare("SELECT COUNT(*) n FROM logistics_carriers").get().n;
  if (carrierCount === 0) {
    const insertCarrier = db.prepare(
      "INSERT INTO logistics_carriers(code, name, country_scope) VALUES(?,?,?)"
    );
    insertCarrier.run("DHL", "DHL", "EU");
    insertCarrier.run("DPD", "DPD", "EU");
    insertCarrier.run("GLS", "GLS", "EU");
    insertCarrier.run("UPS", "UPS", "GLOBAL");
    insertCarrier.run("EVRI", "Evri / Hermes", "UK/EU");

    const ids = Object.fromEntries(
      db.prepare("SELECT id, code FROM logistics_carriers").all().map((row) => [row.code, row.id])
    );
    const insertService = db.prepare(`
      INSERT INTO logistics_shipping_services(
        carrier_id, code, name, max_weight_kg, base_price, delivery_days_min, delivery_days_max, countries
      )
      VALUES(?,?,?,?,?,?,?,?)
    `);
    insertService.run(ids.DHL, "standard", "DHL Paket Standard", 31.5, 4.99, 1, 3, "DE,AT,BE,NL,FR");
    insertService.run(ids.DHL, "express", "DHL Express", 31.5, 11.99, 1, 2, "DE,AT,BE,NL,FR");
    insertService.run(ids.DPD, "standard", "DPD Classic", 31.5, 5.49, 2, 4, "DE,AT,BE,NL,FR,PL");
    insertService.run(ids.GLS, "standard", "GLS Standard", 40, 5.29, 2, 4, "DE,AT,BE,NL,FR,PL,CZ");
    insertService.run(ids.UPS, "standard", "UPS Standard", 70, 8.99, 2, 5, "DE,FR,NL,BE,PL,IT,ES");
  }
}

migrateLogisticsFulfillmentV17();

function migrateWmsInventoryV18() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wms_warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      country_code TEXT DEFAULT 'DE',
      address TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wms_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      code TEXT NOT NULL,
      zone TEXT,
      bin_type TEXT DEFAULT 'standard',
      UNIQUE(warehouse_id, code),
      FOREIGN KEY(warehouse_id) REFERENCES wms_warehouses(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS wms_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      location_id INTEGER,
      product_sku TEXT NOT NULL,
      barcode TEXT,
      on_hand INTEGER DEFAULT 0,
      reserved INTEGER DEFAULT 0,
      damaged INTEGER DEFAULT 0,
      reorder_point INTEGER DEFAULT 10,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(warehouse_id, location_id, product_sku),
      FOREIGN KEY(warehouse_id) REFERENCES wms_warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY(location_id) REFERENCES wms_locations(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS wms_stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      location_id INTEGER,
      product_sku TEXT,
      barcode TEXT,
      movement_type TEXT,
      quantity INTEGER,
      reference TEXT,
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wms_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      location_id INTEGER,
      product_sku TEXT,
      quantity INTEGER,
      order_number TEXT,
      status TEXT DEFAULT 'reserved',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wms_warehouse_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      order_number TEXT,
      job_type TEXT,
      status TEXT DEFAULT 'queued',
      assigned_to INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      FOREIGN KEY(warehouse_id) REFERENCES wms_warehouses(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS wms_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_warehouse_id INTEGER,
      to_warehouse_id INTEGER,
      product_sku TEXT,
      quantity INTEGER,
      status TEXT DEFAULT 'requested',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS wms_stocktakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      location_id INTEGER,
      product_sku TEXT,
      system_qty INTEGER,
      counted_qty INTEGER,
      variance INTEGER,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const warehouseCount = db.prepare("SELECT COUNT(*) n FROM wms_warehouses").get().n;
  if (warehouseCount === 0) {
    const insertWarehouse = db.prepare(
      "INSERT INTO wms_warehouses(code, name, country_code, address) VALUES(?,?,?,?)"
    );
    insertWarehouse.run("DE-01", "Buzzard Hauptlager", "DE", "Hessen");
    insertWarehouse.run("DE-02", "Buzzard Süddepot", "DE", "Bayern");

    const mainId = db.prepare("SELECT id FROM wms_warehouses WHERE code = ?").get("DE-01").id;
    const insertLocation = db.prepare(
      "INSERT INTO wms_locations(warehouse_id, code, zone, bin_type) VALUES(?,?,?,?)"
    );
    insertLocation.run(mainId, "A-01-01", "A", "standard");
    insertLocation.run(mainId, "A-01-02", "A", "standard");
    insertLocation.run(mainId, "B-02-01", "B", "oversize");

    const locationId = db.prepare("SELECT id FROM wms_locations WHERE code = ?").get("A-01-01").id;
    const insertInventory = db.prepare(`
      INSERT INTO wms_inventory(
        warehouse_id, location_id, product_sku, barcode, on_hand, reserved, damaged, reorder_point
      )
      VALUES(?,?,?,?,?,?,?,?)
    `);
    insertInventory.run(mainId, locationId, "BZ-OIL-5W30", "4000000000012", 120, 12, 0, 20);
    insertInventory.run(mainId, locationId, "BZ-GARDEN-001", "4000000000029", 8, 2, 0, 15);
  }
}

migrateWmsInventoryV18();

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
