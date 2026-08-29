const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return (
    process.env.BUZZARD_SUPPLIER_INTEGRATION_HUB !== "0" && process.env.BUZZARD_DB_ENABLED !== "0"
  );
}

function randomCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function createSupplier(body = {}) {
  if (!body.code || !body.name) {
    return { error: "Supplier code and name required", status: 400 };
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO supih_suppliers(
          code, name, country, status, feed_type, base_url, feed_url, auth_type, credentials_ref,
          api_version, supports_dropshipping, supports_blind_shipping, supports_white_label,
          supports_api, supports_xml, supports_csv, supports_ftp, default_currency, lead_time_days
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        body.code,
        body.name,
        body.country || "DE",
        body.status || "active",
        body.feedType || body.feed_type || "api",
        body.baseUrl || body.base_url || "",
        body.feedUrl || body.feed_url || "",
        body.authType || body.auth_type || "none",
        body.credentialsRef || body.credentials_ref || "",
        body.apiVersion || body.api_version || "",
        body.dropshipping || body.supports_dropshipping ? 1 : 0,
        body.blindShipping || body.supports_blind_shipping ? 1 : 0,
        body.whiteLabel || body.supports_white_label ? 1 : 0,
        body.api || body.supports_api ? 1 : 0,
        body.xml || body.supports_xml ? 1 : 0,
        body.csv || body.supports_csv ? 1 : 0,
        body.ftp || body.supports_ftp ? 1 : 0,
        body.currency || body.default_currency || "EUR",
        Number(body.leadTimeDays ?? body.lead_time_days ?? 2)
      );

    return {
      supplier: db.prepare("SELECT * FROM supih_suppliers WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "Supplier code already exists", status: 409 };
  }
}

function listSuppliers() {
  return db.prepare("SELECT * FROM supih_suppliers ORDER BY name").all();
}

function getSupplierByCode(code) {
  const supplier = db.prepare("SELECT * FROM supih_suppliers WHERE code = ?").get(code);
  if (!supplier) return { error: "Supplier not found", status: 404 };

  return {
    supplier,
    mappings: db
      .prepare("SELECT * FROM supih_mappings WHERE supplier_id = ? ORDER BY id DESC")
      .all(supplier.id),
    shipping: db
      .prepare("SELECT * FROM supih_shipping_methods WHERE supplier_id = ?")
      .all(supplier.id),
  };
}

function upsertMapping(code, body = {}) {
  const supplier = db.prepare("SELECT id FROM supih_suppliers WHERE code = ?").get(code);
  if (!supplier) return { error: "Supplier not found", status: 404 };

  const supplierSku = body.supplierSku || body.supplier_sku;
  const buzzardSku = body.buzzardSku || body.buzzard_sku;
  if (!supplierSku || !buzzardSku) {
    return { error: "Supplier SKU and Buzzard SKU required", status: 400 };
  }

  db.prepare(`
    INSERT INTO supih_mappings(
      supplier_id, supplier_sku, buzzard_sku, barcode, category_hint, brand_hint, price_multiplier
    )
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(supplier_id, supplier_sku) DO UPDATE SET
      buzzard_sku = excluded.buzzard_sku,
      barcode = excluded.barcode,
      category_hint = excluded.category_hint,
      brand_hint = excluded.brand_hint,
      price_multiplier = excluded.price_multiplier
  `).run(
    supplier.id,
    supplierSku,
    buzzardSku,
    body.barcode || "",
    body.categoryHint || body.category_hint || "",
    body.brandHint || body.brand_hint || "",
    Number(body.priceMultiplier ?? body.price_multiplier ?? 1)
  );

  return { ok: true };
}

function queueSync(code, body = {}) {
  const supplier = db.prepare("SELECT id FROM supih_suppliers WHERE code = ?").get(code);
  if (!supplier) return { error: "Supplier not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO supih_sync_jobs(supplier_id, job_type, status, started_at)
      VALUES(?,?,?,CURRENT_TIMESTAMP)
    `)
    .run(supplier.id, body.jobType || body.job_type || "full", "running");

  db.prepare(`
    INSERT INTO supih_sync_logs(supplier_id, job_id, level, message)
    VALUES(?,?,?,?)
  `).run(
    supplier.id,
    result.lastInsertRowid,
    "info",
    "Sync job queued for real connector execution"
  );

  db.prepare("UPDATE supih_sync_jobs SET status = 'queued' WHERE id = ?").run(result.lastInsertRowid);

  return {
    jobId: result.lastInsertRowid,
    status: "queued",
    next: "worker executes supplier API/XML connector",
    accepted: true,
  };
}

function listSyncJobs() {
  return db
    .prepare(`
      SELECT j.*, s.code supplier_code, s.name supplier_name
      FROM supih_sync_jobs j
      JOIN supih_suppliers s ON s.id = j.supplier_id
      ORDER BY j.id DESC
      LIMIT 200
    `)
    .all();
}

function addSnapshot(code, body = {}) {
  const supplier = db.prepare("SELECT id FROM supih_suppliers WHERE code = ?").get(code);
  if (!supplier) return { error: "Supplier not found", status: 404 };

  db.prepare(`
    INSERT INTO supih_product_snapshots(
      supplier_id, supplier_sku, buzzard_sku, supplier_price, currency, stock_qty, lead_time_days, raw_ref
    )
    VALUES(?,?,?,?,?,?,?,?)
  `).run(
    supplier.id,
    body.supplierSku || body.supplier_sku || "",
    body.buzzardSku || body.buzzard_sku || "",
    Number(body.price ?? body.supplier_price ?? 0),
    body.currency || "EUR",
    Number(body.stock ?? body.stock_qty ?? 0),
    Number(body.leadTimeDays ?? body.lead_time_days ?? 0),
    body.rawRef || body.raw_ref || ""
  );

  return { ok: true };
}

function addShippingMethod(code, body = {}) {
  const supplier = db.prepare("SELECT id FROM supih_suppliers WHERE code = ?").get(code);
  if (!supplier) return { error: "Supplier not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO supih_shipping_methods(
        supplier_id, code, name, carrier, service, price, currency, estimated_days
      )
      VALUES(?,?,?,?,?,?,?,?)
    `)
    .run(
      supplier.id,
      body.code || randomCode(),
      body.name || "",
      body.carrier || "",
      body.service || "",
      Number(body.price || 0),
      body.currency || "EUR",
      Number(body.estimatedDays ?? body.estimated_days ?? 2)
    );

  return {
    method: db.prepare("SELECT * FROM supih_shipping_methods WHERE id = ?").get(result.lastInsertRowid),
    created: true,
  };
}

function createSupplierOrder(body = {}, req = null) {
  const salesGuard = require("./commerce/salesGuard");
  const block = salesGuard.assertSupplierOrderAllowed({ req });
  if (block) return salesGuard.blockHttpResult(block);

  const supplierCode = body.supplierCode || body.supplier_code;
  const buzzardOrderNumber = body.buzzardOrderNumber || body.buzzard_order_number;
  if (!supplierCode || !buzzardOrderNumber) {
    return { error: "Supplier code and Buzzard order required", status: 400 };
  }

  const supplier = db.prepare("SELECT * FROM supih_suppliers WHERE code = ?").get(supplierCode);
  if (!supplier) return { error: "Supplier not found", status: 404 };
  if (!supplier.supports_dropshipping) {
    return { error: "Supplier does not support dropshipping", status: 400 };
  }

  const result = db
    .prepare(`
      INSERT INTO supih_orders(
        supplier_id, buzzard_order_number, status, dropship, blind_shipping, white_label, payload_json
      )
      VALUES(?,?,?,?,?,?,?)
    `)
    .run(
      supplier.id,
      buzzardOrderNumber,
      "queued",
      1,
      body.blindShipping || body.blind_shipping ? 1 : 0,
      body.whiteLabel || body.white_label ? 1 : 0,
      JSON.stringify(body.payload || {})
    );

  return {
    supplierOrderId: result.lastInsertRowid,
    status: "queued",
    next: "route through supplier connector",
    accepted: true,
  };
}

function getSupplierIntegrationHubOverview() {
  return {
    suppliers: db.prepare("SELECT COUNT(*) n FROM supih_suppliers").get().n,
    active: db.prepare("SELECT COUNT(*) n FROM supih_suppliers WHERE status = 'active'").get().n,
    dropship: db.prepare("SELECT COUNT(*) n FROM supih_suppliers WHERE supports_dropshipping = 1").get().n,
    blindShipping: db
      .prepare("SELECT COUNT(*) n FROM supih_suppliers WHERE supports_blind_shipping = 1")
      .get().n,
    whiteLabel: db
      .prepare("SELECT COUNT(*) n FROM supih_suppliers WHERE supports_white_label = 1")
      .get().n,
    mappings: db.prepare("SELECT COUNT(*) n FROM supih_mappings WHERE active = 1").get().n,
    syncJobs: db.prepare("SELECT COUNT(*) n FROM supih_sync_jobs").get().n,
    supplierOrders: db.prepare("SELECT COUNT(*) n FROM supih_orders").get().n,
  };
}

function getSupplierIntegrationHubStatus() {
  const overview = getSupplierIntegrationHubOverview();
  return {
    version: "3.1.0",
    enabled: isEnabled(),
    totals: {
      suppliers: overview.suppliers,
      active: overview.active,
      dropship: overview.dropship,
      blindShipping: overview.blindShipping,
      whiteLabel: overview.whiteLabel,
      mappings: overview.mappings,
      syncJobs: overview.syncJobs,
      supplierOrders: overview.supplierOrders,
      snapshots: db.prepare("SELECT COUNT(*) n FROM supih_product_snapshots").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  createSupplier,
  listSuppliers,
  getSupplierByCode,
  upsertMapping,
  queueSync,
  listSyncJobs,
  addSnapshot,
  addShippingMethod,
  createSupplierOrder,
  getSupplierIntegrationHubOverview,
  getSupplierIntegrationHubStatus,
};
