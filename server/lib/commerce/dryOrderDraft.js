/**
 * Dry order drafts from a READY_FOR_REVIEW catalog + price + stock object.
 * No payment capture, no PIM write, no supplier purchase, sales stay LOCKED.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { DECISIONS } = require("./commercialCore");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

function createDraftStore({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), `buzzard-dry-ord-${crypto.randomBytes(4).toString("hex")}.sqlite`);
  assertNotGuardian(resolved);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS dry_order_drafts (
      order_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      product_id TEXT,
      qty INTEGER NOT NULL,
      unit_price REAL,
      line_total REAL,
      currency TEXT,
      status TEXT NOT NULL,
      order_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (customer_id, sku, status)
    );
    CREATE TABLE IF NOT EXISTS dry_order_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      event TEXT NOT NULL,
      at TEXT NOT NULL,
      detail TEXT
    );
  `);
  return { db, dbPath: resolved };
}

function audit(db, orderId, event, detail) {
  db.prepare(`INSERT INTO dry_order_audit (order_id, event, at, detail) VALUES (?,?,?,?)`).run(
    orderId || null,
    event,
    new Date().toISOString(),
    detail ? JSON.stringify(detail) : null
  );
}

function snapshotProduct(product) {
  return {
    productId: product.catalog?.productId || null,
    sku: product.catalog?.sku || null,
    supplierId: product.catalog?.supplierId || null,
    ean: product.catalog?.ean || null,
    categoryId: product.catalog?.buzzardCategoryId || null,
    subcategoryId: product.catalog?.subcategoryId || null,
    currency: product.catalog?.currency || "EUR",
    title: product.catalog?.productTitle || null,
    price: product.price
      ? {
          gross: product.price.finalRecommendedPrice,
          sellNet: product.price.sellNet,
          vat: product.price.vat,
          netProfit: product.price.netProfit,
          margin: product.price.profitMargin,
          livePriceWrite: false,
        }
      : null,
    stock: product.stock
      ? {
          available: product.stock.availableStock,
          supplier: product.stock.supplierStock,
          reserved: product.stock.reservedStock,
          sync: product.stock.sync,
        }
      : null,
  };
}

function draftOne({ product, customerId = "SYN-CUST", qty = 1, store } = {}) {
  const salesGate = evaluateSalesGate();
  if (salesGate.allowed === true || salesGate.status !== "LOCKED") {
    return {
      ok: false,
      code: "SALES_MUST_STAY_LOCKED",
      salesGate: salesGate.status,
      paymentCaptured: false,
      live: false,
    };
  }
  if (!product || product.decision !== DECISIONS.READY_FOR_REVIEW) {
    return {
      ok: false,
      code: "NOT_READY_FOR_REVIEW",
      decision: product?.decision || null,
      sku: product?.catalog?.sku || null,
      paymentCaptured: false,
      live: false,
    };
  }
  const catalog = product.catalog || {};
  const unit = Number(product.price?.finalRecommendedPrice);
  const available = Number(product.stock?.availableStock);
  if (!(unit > 0) || product.price?.salesEnabled === true) {
    return { ok: false, code: "PRICE_NOT_READY", sku: catalog.sku, paymentCaptured: false, live: false };
  }
  if (!(available >= qty) || product.stock?.sync?.mode !== "DRY_RUN") {
    return { ok: false, code: "STOCK_NOT_READY", sku: catalog.sku, paymentCaptured: false, live: false };
  }

  const orderId = `DRY-ORD-${crypto.randomBytes(5).toString("hex")}`;
  const lineTotal = roundMoney(unit * qty);
  const payload = {
    orderId,
    status: "DRAFT",
    orderType: "READINESS_TEST",
    customerId,
    qty,
    unitPrice: unit,
    lineTotal,
    currency: catalog.currency || "EUR",
    catalog: snapshotProduct(product),
    payment: {
      captured: false,
      authorized: false,
      realMoneyMovement: false,
      provider: "NONE",
      status: "NONE",
    },
    supplierPurchase: false,
    pimWrite: false,
    published: false,
    salesEnabled: false,
    salesGate: "LOCKED",
    live: false,
  };

  if (store?.db) {
    try {
      store.db
        .prepare(
          `INSERT INTO dry_order_drafts
           (order_id, customer_id, sku, product_id, qty, unit_price, line_total, currency, status, order_type, payload_json, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .run(
          orderId,
          customerId,
          catalog.sku,
          catalog.productId,
          qty,
          unit,
          lineTotal,
          payload.currency,
          "DRAFT",
          "READINESS_TEST",
          JSON.stringify(payload),
          new Date().toISOString()
        );
      audit(store.db, orderId, "DRAFT_CREATED", { sku: catalog.sku, customerId });
    } catch (error) {
      if (String(error.message || "").includes("UNIQUE")) {
        audit(store.db, null, "DUPLICATE_DRAFT", { sku: catalog.sku, customerId });
        return {
          ok: false,
          code: "DUPLICATE_DRAFT",
          sku: catalog.sku,
          customerId,
          paymentCaptured: false,
          live: false,
        };
      }
      throw error;
    }
  }

  return { ok: true, ...payload, paymentCaptured: false };
}

function draftOrdersFromDryRun(result, { customerId = "SYN-CUST", qty = 1, store } = {}) {
  const salesGate = evaluateSalesGate();
  const drafts = (result?.products || []).map((product) => draftOne({ product, customerId, qty, store }));
  const accepted = drafts.filter((row) => row.ok === true);
  return {
    ok: salesGate.status === "LOCKED" && accepted.length > 0,
    dryRun: true,
    live: false,
    salesEnabled: false,
    productionReady: false,
    pimWrite: false,
    paymentCaptured: false,
    supplierPurchase: false,
    salesGate: salesGate.status,
    stages: ["CATALOG_REVIEW", "PRICE_SNAPSHOT", "STOCK_SNAPSHOT", "ORDER_DRAFT", "PAYMENT_SKIPPED"],
    drafts,
    summary: {
      total: drafts.length,
      drafted: accepted.length,
      blocked: drafts.length - accepted.length,
    },
    dbPath: store?.dbPath || null,
  };
}

function listDrafts(store) {
  if (!store?.db) return [];
  return store.db.prepare(`SELECT * FROM dry_order_drafts ORDER BY created_at`).all().map((row) => ({
    ...row,
    payload: JSON.parse(row.payload_json),
  }));
}

function reopenStore({ dbPath } = {}) {
  return createDraftStore({ dbPath });
}

module.exports = {
  createDraftStore,
  reopenStore,
  draftOne,
  draftOrdersFromDryRun,
  listDrafts,
};
