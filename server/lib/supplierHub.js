const { XMLParser } = require("fast-xml-parser");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_SUPPLIER_HUB !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function marginPercent(cost, sell) {
  return sell > 0 ? Number((((sell - cost) / sell) * 100).toFixed(2)) : null;
}

function parseSupplierFeed(format, payload) {
  if (format === "json") {
    return Array.isArray(payload) ? payload : payload?.products || [];
  }
  if (format === "xml") {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(String(payload || ""));
    const list = parsed?.products?.product ?? parsed?.catalog?.product ?? [];
    return Array.isArray(list) ? list : [list].filter(Boolean);
  }
  throw new Error("Unsupported feed format");
}

function listSuppliers() {
  return db
    .prepare(`
      SELECT s.*, COUNT(sp.id) product_count
      FROM suppliers s
      LEFT JOIN supplier_products sp ON sp.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.id DESC
    `)
    .all()
    .map((row) => ({
      ...row,
      active: Boolean(row.active),
      dropship: Boolean(row.dropship),
    }));
}

function createSupplier(body = {}) {
  const { code, name, country, feedType = "manual", feedUrl = "", apiKey = "", dropship = false } = body;
  if (!code || !name) return { error: "code and name required", status: 400 };
  try {
    const result = db
      .prepare(`
        INSERT INTO suppliers(code, name, country, feed_type, feed_url, api_key, dropship)
        VALUES(?,?,?,?,?,?,?)
      `)
      .run(code, name, country || "", feedType, feedUrl, apiKey, dropship ? 1 : 0);
    const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(result.lastInsertRowid);
    return { supplier: { ...supplier, active: Boolean(supplier.active), dropship: Boolean(supplier.dropship) } };
  } catch {
    return { error: "Supplier code already exists", status: 409 };
  }
}

function updateSupplier(id, body = {}) {
  const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id);
  if (!supplier) return { error: "Supplier not found", status: 404 };
  db.prepare(`
    UPDATE suppliers
    SET name = ?, country = ?, feed_type = ?, feed_url = ?, api_key = ?, active = ?, dropship = ?
    WHERE id = ?
  `).run(
    body.name ?? supplier.name,
    body.country ?? supplier.country,
    body.feedType ?? body.feed_type ?? supplier.feed_type,
    body.feedUrl ?? body.feed_url ?? supplier.feed_url,
    body.apiKey ?? body.api_key ?? supplier.api_key,
    body.active === undefined ? supplier.active : body.active ? 1 : 0,
    body.dropship === undefined ? supplier.dropship : body.dropship ? 1 : 0,
    supplier.id
  );
  const updated = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(supplier.id);
  return { supplier: { ...updated, active: Boolean(updated.active), dropship: Boolean(updated.dropship) } };
}

function listSupplierProducts(supplierId) {
  return db
    .prepare("SELECT * FROM supplier_products WHERE supplier_id = ? ORDER BY id DESC")
    .all(supplierId);
}

function syncSupplierFeed(supplierId, body = {}) {
  const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(supplierId);
  if (!supplier) return { error: "Supplier not found", status: 404 };

  const { format = "json", payload = [] } = body;
  let list = [];
  try {
    list = parseSupplierFeed(format, payload);
  } catch (error) {
    const run = db
      .prepare("INSERT INTO sync_runs(supplier_id, status, errors, message) VALUES(?,?,?,?)")
      .run(supplier.id, "failed", 1, error.message);
    return { error: error.message, runId: run.lastInsertRowid, status: 400 };
  }

  let imported = 0;
  let updated = 0;
  let errors = 0;
  const upsert = db.prepare(`
    INSERT INTO supplier_products (supplier_id, supplier_sku, buzzard_sku, name, cost_eur, stock, updated_at)
    VALUES(?,?,?,?,?,?, CURRENT_TIMESTAMP)
    ON CONFLICT(supplier_id, supplier_sku) DO UPDATE SET
      buzzard_sku = excluded.buzzard_sku,
      name = excluded.name,
      cost_eur = excluded.cost_eur,
      stock = excluded.stock,
      updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction(() => {
    for (const item of list) {
      try {
        const sku = String(item.sku ?? item.id ?? item.SupplierSKU ?? "").trim();
        if (!sku) throw new Error("Missing SKU");
        const cost = Number(item.cost_eur ?? item.cost ?? item.price ?? 0);
        const stock = Number(item.stock ?? item.quantity ?? 0);
        const existing = db
          .prepare("SELECT id FROM supplier_products WHERE supplier_id = ? AND supplier_sku = ?")
          .get(supplier.id, sku);
        upsert.run(
          supplier.id,
          sku,
          item.buzzard_sku ?? item.BuzzardSKU ?? null,
          item.name ?? item.title ?? sku,
          cost,
          stock
        );
        if (existing) updated += 1;
        else imported += 1;
      } catch (error) {
        errors += 1;
        db.prepare("INSERT INTO sync_errors(supplier_id, message, payload) VALUES(?,?,?)").run(
          supplier.id,
          error.message,
          JSON.stringify(item)
        );
      }
    }
  });
  tx();

  const run = db
    .prepare(`
      INSERT INTO sync_runs(supplier_id, status, imported, updated, errors, message)
      VALUES(?,?,?,?,?,?)
    `)
    .run(
      supplier.id,
      errors ? "completed_with_errors" : "completed",
      imported,
      updated,
      errors,
      `${list.length} records processed`
    );

  return { runId: run.lastInsertRowid, imported, updated, errors };
}

function listSyncRuns(limit = 100) {
  return db
    .prepare(`
      SELECT sr.*, s.name supplier_name
      FROM sync_runs sr
      JOIN suppliers s ON s.id = sr.supplier_id
      ORDER BY sr.id DESC
      LIMIT ?
    `)
    .all(limit);
}

function listVehicles(filters = {}) {
  let sql = "SELECT * FROM vehicles WHERE 1=1";
  const args = [];
  if (filters.make) {
    sql += " AND make = ?";
    args.push(filters.make);
  }
  if (filters.model) {
    sql += " AND model = ?";
    args.push(filters.model);
  }
  sql += " ORDER BY make, model, year_from";
  return db.prepare(sql).all(...args);
}

function seedDemoVehicles() {
  const rows = [
    ["BMW", "3 Series", 2019, 2026, "2.0 Diesel"],
    ["BMW", "5 Series", 2018, 2026, "2.0 Diesel"],
    ["Mercedes-Benz", "C-Class", 2019, 2026, "2.0 Diesel"],
    ["Volkswagen", "Golf", 2020, 2026, "1.5 TSI"],
    ["Audi", "A4", 2019, 2026, "2.0 TDI"],
  ];
  const insert = db.prepare(
    "INSERT INTO vehicles(make, model, year_from, year_to, engine) VALUES(?,?,?,?,?)"
  );
  const tx = db.transaction(() => {
    for (const row of rows) insert.run(...row);
  });
  tx();
  return { ok: true, count: rows.length };
}

function linkCompatibility({ productSku, vehicleId }) {
  if (!productSku || !vehicleId) {
    return { error: "productSku and vehicleId required", status: 400 };
  }
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicleId);
  if (!vehicle) return { error: "Vehicle not found", status: 404 };

  const status = process.env.TECDOC_API_KEY ? "pending_tecdoc" : "pending_tecdoc";
  db.prepare(`
    INSERT OR REPLACE INTO compatibility(product_sku, vehicle_id, status, source)
    VALUES(?,?,?,?)
  `).run(productSku, vehicleId, status, "tecdoc_adapter");

  return {
    productSku,
    vehicle,
    status,
    source: "tecdoc_adapter",
    licensed: Boolean(process.env.TECDOC_API_KEY),
  };
}

function listCompatibilityForSku(sku) {
  return db
    .prepare(`
      SELECT c.*, v.make, v.model, v.year_from, v.year_to, v.engine
      FROM compatibility c
      JOIN vehicles v ON v.id = c.vehicle_id
      WHERE c.product_sku = ?
    `)
    .all(sku);
}

function listCompatibleSkusForVehicle(vehicleId) {
  return db
    .prepare("SELECT DISTINCT product_sku FROM compatibility WHERE vehicle_id = ? ORDER BY product_sku")
    .all(vehicleId)
    .map((row) => row.product_sku);
}

function listMargins() {
  const rows = db
    .prepare(`
      SELECT sp.supplier_sku, sp.name, sp.cost_eur, p.price_eur
      FROM supplier_products sp
      LEFT JOIN products p ON p.sku = sp.buzzard_sku
      ORDER BY sp.id DESC
    `)
    .all();
  return rows.map((row) => ({
    ...row,
    margin_percent: row.price_eur ? marginPercent(row.cost_eur, row.price_eur) : null,
  }));
}

function getSupplierHubStatus() {
  return {
    version: "0.7.0",
    enabled: isEnabled(),
    tecdocConfigured: Boolean(process.env.TECDOC_API_KEY),
    totals: {
      suppliers: db.prepare("SELECT COUNT(*) n FROM suppliers").get().n,
      supplierProducts: db.prepare("SELECT COUNT(*) n FROM supplier_products").get().n,
      vehicles: db.prepare("SELECT COUNT(*) n FROM vehicles").get().n,
      syncRuns: db.prepare("SELECT COUNT(*) n FROM sync_runs").get().n,
      compatibility: db.prepare("SELECT COUNT(*) n FROM compatibility").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  listSuppliers,
  createSupplier,
  updateSupplier,
  listSupplierProducts,
  syncSupplierFeed,
  listSyncRuns,
  listVehicles,
  seedDemoVehicles,
  linkCompatibility,
  listCompatibilityForSku,
  listCompatibleSkusForVehicle,
  listMargins,
  getSupplierHubStatus,
  parseSupplierFeed,
};
