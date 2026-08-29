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
      SELECT s.*,
             COUNT(sp.id) product_count,
             (SELECT COUNT(*) FROM supplier_sync_jobs j WHERE j.supplier_id = s.id AND j.status = 'queued') queued_jobs
      FROM suppliers s
      LEFT JOIN supplier_products sp ON sp.supplier_id = s.id AND sp.active = 1
      GROUP BY s.id
      ORDER BY COALESCE(s.rating, 0) DESC, s.name
    `)
    .all()
    .map((row) => ({
      ...row,
      active: Boolean(row.active),
      dropship: Boolean(row.dropship),
      api_enabled: Boolean(row.api_enabled),
      xml_enabled: Boolean(row.xml_enabled),
      tecdoc_enabled: Boolean(row.tecdoc_enabled),
      white_label_enabled: Boolean(row.white_label_enabled),
      blind_shipping: Boolean(row.blind_shipping),
      products: row.product_count,
      queuedJobs: row.queued_jobs,
    }));
}

function createSupplier(body = {}) {
  const {
    code,
    name,
    country,
    countryCode,
    feedType = "manual",
    feedUrl = "",
    apiKey = "",
    dropship = false,
    apiEnabled = false,
    xmlEnabled = false,
    tecdocEnabled = false,
    whiteLabelEnabled = false,
    blindShipping = false,
    currency = "EUR",
    rating = 0,
    leadTimeDays = 3,
    status = "active",
  } = body;
  if (!code || !name) return { error: "code and name required", status: 400 };
  try {
    const result = db
      .prepare(`
        INSERT INTO suppliers(
          code, name, country, feed_type, feed_url, api_key, dropship,
          api_enabled, xml_enabled, tecdoc_enabled, white_label_enabled, blind_shipping,
          currency, rating, lead_time_days, status
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        code,
        name,
        countryCode || country || "DE",
        feedType,
        feedUrl,
        apiKey,
        dropship ? 1 : 0,
        apiEnabled ? 1 : 0,
        xmlEnabled ? 1 : 0,
        tecdocEnabled ? 1 : 0,
        whiteLabelEnabled ? 1 : 0,
        blindShipping ? 1 : 0,
        currency,
        Number(rating || 0),
        Number(leadTimeDays || 3),
        status
      );
    const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(result.lastInsertRowid);
    return { supplier: listSuppliers().find((row) => row.id === supplier.id) || supplier };
  } catch {
    return { error: "Supplier code already exists", status: 409 };
  }
}

function updateSupplier(id, body = {}) {
  const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id);
  if (!supplier) return { error: "Supplier not found", status: 404 };
  db.prepare(`
    UPDATE suppliers
    SET name = ?, country = ?, feed_type = ?, feed_url = ?, api_key = ?, active = ?, dropship = ?,
        api_enabled = ?, xml_enabled = ?, tecdoc_enabled = ?, white_label_enabled = ?, blind_shipping = ?,
        currency = ?, rating = ?, lead_time_days = ?, status = ?
    WHERE id = ?
  `).run(
    body.name ?? supplier.name,
    body.countryCode ?? body.country ?? supplier.country,
    body.feedType ?? body.feed_type ?? supplier.feed_type,
    body.feedUrl ?? body.feed_url ?? supplier.feed_url,
    body.apiKey ?? body.api_key ?? supplier.api_key,
    body.active === undefined ? supplier.active : body.active ? 1 : 0,
    body.dropshipEnabled === undefined
      ? body.dropship === undefined
        ? supplier.dropship
        : body.dropship
          ? 1
          : 0
      : body.dropshipEnabled
        ? 1
        : 0,
    body.apiEnabled === undefined ? supplier.api_enabled : body.apiEnabled ? 1 : 0,
    body.xmlEnabled === undefined ? supplier.xml_enabled : body.xmlEnabled ? 1 : 0,
    body.tecdocEnabled === undefined ? supplier.tecdoc_enabled : body.tecdocEnabled ? 1 : 0,
    body.whiteLabelEnabled === undefined ? supplier.white_label_enabled : body.whiteLabelEnabled ? 1 : 0,
    body.blindShipping === undefined ? supplier.blind_shipping : body.blindShipping ? 1 : 0,
    body.currency ?? supplier.currency ?? "EUR",
    body.rating ?? supplier.rating ?? 0,
    body.leadTimeDays ?? supplier.lead_time_days ?? 3,
    body.status ?? supplier.status ?? "active",
    supplier.id
  );
  const updated = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(supplier.id);
  return { supplier: listSuppliers().find((row) => row.id === updated.id) || updated };
}

function listSupplierProducts(supplierId) {
  return db
    .prepare("SELECT * FROM supplier_products WHERE supplier_id = ? ORDER BY updated_at DESC, id DESC")
    .all(supplierId)
    .map((row) => ({
      ...row,
      product_sku: row.product_sku || row.buzzard_sku || "",
      cost: row.cost_eur,
    }));
}

function upsertSupplierProduct(supplierId, body = {}) {
  const supplier = db.prepare("SELECT id FROM suppliers WHERE id = ?").get(supplierId);
  if (!supplier) return { error: "Supplier not found", status: 404 };
  if (!body.supplierSku || !body.name) return { error: "supplierSku and name required", status: 400 };

  const productSku = body.productSku || body.buzzardSku || "";
  db.prepare(`
    INSERT INTO supplier_products(
      supplier_id, supplier_sku, product_sku, buzzard_sku, name, cost_eur, stock, brand, category, ean, tecdoc_article, active, updated_at
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(supplier_id, supplier_sku) DO UPDATE SET
      product_sku = excluded.product_sku,
      buzzard_sku = excluded.buzzard_sku,
      name = excluded.name,
      cost_eur = excluded.cost_eur,
      stock = excluded.stock,
      brand = excluded.brand,
      category = excluded.category,
      ean = excluded.ean,
      tecdoc_article = excluded.tecdoc_article,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    supplier.id,
    body.supplierSku,
    productSku,
    productSku,
    body.name,
    Number(body.cost ?? body.cost_eur ?? 0),
    Number(body.stock || 0),
    body.brand || "",
    body.category || "",
    body.ean || "",
    body.tecdocArticle || ""
  );

  return { ok: true };
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
    INSERT INTO supplier_products (supplier_id, supplier_sku, product_sku, buzzard_sku, name, cost_eur, stock, updated_at)
    VALUES(?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
    ON CONFLICT(supplier_id, supplier_sku) DO UPDATE SET
      product_sku = excluded.product_sku,
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
        const mappedSku = item.buzzard_sku ?? item.BuzzardSKU ?? item.product_sku ?? null;
        const existing = db
          .prepare("SELECT id FROM supplier_products WHERE supplier_id = ? AND supplier_sku = ?")
          .get(supplier.id, sku);
        upsert.run(supplier.id, sku, mappedSku, mappedSku, item.name ?? item.title ?? sku, cost, stock);
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
    version: "1.6.0",
    enabled: isEnabled(),
    tecdocConfigured: Boolean(process.env.TECDOC_API_KEY),
    totals: {
      suppliers: db.prepare("SELECT COUNT(*) n FROM suppliers").get().n,
      supplierProducts: db.prepare("SELECT COUNT(*) n FROM supplier_products WHERE active = 1").get().n,
      vehicles: db.prepare("SELECT COUNT(*) n FROM vehicles").get().n,
      syncRuns: db.prepare("SELECT COUNT(*) n FROM sync_runs").get().n,
      syncJobs: db.prepare("SELECT COUNT(*) n FROM supplier_sync_jobs").get().n,
      supplierOrders: db.prepare("SELECT COUNT(*) n FROM supplier_orders").get().n,
      queuedJobs: db
        .prepare("SELECT COUNT(*) n FROM supplier_sync_jobs WHERE status = 'queued'")
        .get().n,
      compatibility: db.prepare("SELECT COUNT(*) n FROM compatibility").get().n,
    },
  };
}

function queueSupplierSyncAll() {
  const suppliers = db.prepare("SELECT id FROM suppliers WHERE status = 'active' OR active = 1").all();
  const insert = db.prepare(
    "INSERT INTO supplier_sync_jobs(supplier_id, job_type, entity_key) VALUES(?,?,?)"
  );
  const tx = db.transaction(() => {
    suppliers.forEach((supplier) => {
      insert.run(supplier.id, "catalog", "*");
      insert.run(supplier.id, "stock", "*");
      insert.run(supplier.id, "price", "*");
    });
  });
  tx();
  return { suppliers: suppliers.length, queued: suppliers.length * 3 };
}

function listSupplierSyncJobs() {
  return db
    .prepare(`
      SELECT j.*, s.code supplier, s.name supplier_name
      FROM supplier_sync_jobs j
      LEFT JOIN suppliers s ON s.id = j.supplier_id
      ORDER BY j.id DESC
      LIMIT 200
    `)
    .all();
}

function updateSupplierSyncJobResult(jobId, body = {}) {
  const job = db.prepare("SELECT id FROM supplier_sync_jobs WHERE id = ?").get(jobId);
  if (!job) return { error: "Sync job not found", status: 404 };
  db.prepare(`
    UPDATE supplier_sync_jobs
    SET status = ?, attempts = attempts + 1, error_message = ?, finished_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(body.status === "success" ? "success" : "failed", body.error || null, jobId);
  return { ok: true };
}

function searchSourcing(filters = {}) {
  const sku = filters.sku || "";
  const category = filters.category || "";
  let sql = `
    SELECT sp.*, s.code supplier, s.name supplier_name, s.rating, s.lead_time_days,
           s.dropship AS dropship_enabled, s.white_label_enabled, s.blind_shipping, s.tecdoc_enabled
    FROM supplier_products sp
    JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.active = 1
  `;
  const args = [];
  if (sku) {
    sql += " AND (sp.product_sku = ? OR sp.buzzard_sku = ? OR sp.supplier_sku = ? OR sp.ean = ? OR sp.tecdoc_article = ?)";
    args.push(sku, sku, sku, sku, sku);
  }
  if (category) {
    sql += " AND sp.category = ?";
    args.push(category);
  }
  sql += " ORDER BY (sp.stock > 0) DESC, s.rating DESC, sp.cost_eur ASC";
  return db.prepare(sql).all(...args).map((row) => ({
    ...row,
    product_sku: row.product_sku || row.buzzard_sku || "",
    cost: row.cost_eur,
  }));
}

function createSupplierOrder(body = {}, req = null) {
  const salesGuard = require("./commerce/salesGuard");
  const block = salesGuard.assertSupplierOrderAllowed({ req });
  if (block) return salesGuard.blockHttpResult(block);

  const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(body.supplierId);
  if (!supplier) return { error: "Supplier not found", status: 404 };
  if (!supplier.dropship) return { error: "Supplier does not support dropshipping", status: 400 };
  if (!body.orderNumber) return { error: "orderNumber required", status: 400 };

  const result = db
    .prepare(`
      INSERT INTO supplier_orders(supplier_id, order_number, status, shipping_method, white_label, blind_shipping, payload_json)
      VALUES(?,?,?,?,?,?,?)
    `)
    .run(
      supplier.id,
      body.orderNumber,
      "queued",
      body.shippingMethod || "standard",
      body.whiteLabel ? 1 : 0,
      body.blindShipping === undefined ? (supplier.blind_shipping ? 1 : 0) : body.blindShipping ? 1 : 0,
      JSON.stringify(body)
    );

  return {
    order: db.prepare("SELECT * FROM supplier_orders WHERE id = ?").get(result.lastInsertRowid),
    status: 201,
  };
}

function listSupplierOrders() {
  return db
    .prepare(`
      SELECT o.*, s.code supplier, s.name supplier_name
      FROM supplier_orders o
      JOIN suppliers s ON s.id = o.supplier_id
      ORDER BY o.id DESC
    `)
    .all();
}

module.exports = {
  isEnabled,
  listSuppliers,
  createSupplier,
  updateSupplier,
  listSupplierProducts,
  upsertSupplierProduct,
  syncSupplierFeed,
  listSyncRuns,
  queueSupplierSyncAll,
  listSupplierSyncJobs,
  updateSupplierSyncJobResult,
  searchSourcing,
  createSupplierOrder,
  listSupplierOrders,
  listVehicles,
  seedDemoVehicles,
  linkCompatibility,
  listCompatibilityForSku,
  listCompatibleSkusForVehicle,
  listMargins,
  getSupplierHubStatus,
  parseSupplierFeed,
};
