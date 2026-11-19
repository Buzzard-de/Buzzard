const { db } = require("./db");
const { validateMarketplaceListing } = require("./storefront/merchantFeedService");
const { createConnector, snapshot: connectorSnapshot } = require("./marketplace/marketplaceConnectorRegistry");

const CHANNELS = [
  ["amazon", "Amazon"],
  ["ebay", "eBay"],
  ["google_shopping", "Google Shopping"],
  ["tiktok_shop", "TikTok Shop"],
];

function isEnabled() {
  return process.env.BUZZARD_MARKETPLACE_HUB !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function listMarketplaces() {
  return db
    .prepare("SELECT * FROM marketplace_channels ORDER BY name")
    .all()
    .map((marketplace) => ({
      ...marketplace,
      listings: db
        .prepare("SELECT COUNT(*) n FROM marketplace_listings WHERE marketplace_id = ?")
        .get(marketplace.id).n,
      queuedJobs: db
        .prepare(
          "SELECT COUNT(*) n FROM marketplace_sync_jobs WHERE marketplace_id = ? AND status = 'queued'"
        )
        .get(marketplace.id).n,
    }));
}

function updateMarketplace(code, body = {}) {
  const marketplace = db.prepare("SELECT * FROM marketplace_channels WHERE code = ?").get(code);
  if (!marketplace) return { error: "Marketplace not found", status: 404 };
  db.prepare(
    "UPDATE marketplace_channels SET enabled = ?, account_label = ?, status = ?, last_sync = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(
    body.enabled ? 1 : 0,
    body.accountLabel || marketplace.account_label || "",
    body.enabled ? "connected" : "disconnected",
    marketplace.id
  );
  return {
    marketplace: db.prepare("SELECT * FROM marketplace_channels WHERE id = ?").get(marketplace.id),
  };
}

function queueStockSync() {
  const rows = db.prepare("SELECT * FROM marketplace_listings").all();
  const insert = db.prepare(
    "INSERT INTO marketplace_sync_jobs(marketplace_id, job_type, entity_key, payload_json) VALUES(?,?,?,?)"
  );
  const tx = db.transaction(() => {
    rows.forEach((row) => {
      insert.run(row.marketplace_id, "stock", row.product_sku, JSON.stringify({ stock: row.stock }));
    });
  });
  tx();
  return { queued: rows.length };
}

function queuePriceSync() {
  const rows = db.prepare("SELECT * FROM marketplace_listings").all();
  const insert = db.prepare(
    "INSERT INTO marketplace_sync_jobs(marketplace_id, job_type, entity_key, payload_json) VALUES(?,?,?,?)"
  );
  const tx = db.transaction(() => {
    rows.forEach((row) => {
      insert.run(
        row.marketplace_id,
        "price",
        row.product_sku,
        JSON.stringify({ price: row.price, currency: row.currency })
      );
    });
  });
  tx();
  return { queued: rows.length };
}

function queueOrderSync() {
  const marketplaces = db.prepare("SELECT * FROM marketplace_channels WHERE enabled = 1").all();
  const insert = db.prepare(
    "INSERT INTO marketplace_sync_jobs(marketplace_id, job_type, entity_key, payload_json) VALUES(?,?,?,?)"
  );
  const tx = db.transaction(() => {
    marketplaces.forEach((marketplace) => {
      insert.run(marketplace.id, "orders", "*", "{}");
    });
  });
  tx();
  return { queued: marketplaces.length };
}

function preflightListing(body = {}) {
  const connector = createConnector(body.marketplace);
  if (connector.ok === false) return { ok: false, code: connector.code, live: false };
  const validation = validateMarketplaceListing({
    sku: body.productSku,
    title: body.title,
    gtin: body.gtin || body.ean,
    mpn: body.mpn,
    image_link: body.imageLink || body.image_link,
    images: body.images,
  });
  const dryPublish =
    validation.ok && typeof connector.publishListing === "function"
      ? connector.publishListing({
          sku: body.productSku,
          title: body.title,
          gtin: body.gtin || body.ean,
          mpn: body.mpn,
          image_link: body.imageLink || body.image_link,
        })
      : null;
  return {
    ok: validation.ok,
    validation,
    connector: body.marketplace,
    dryPublish,
    live: false,
    publishAllowed: false,
  };
}

function upsertListing(body = {}) {
  const marketplace = db.prepare("SELECT * FROM marketplace_channels WHERE code = ?").get(body.marketplace);
  if (!marketplace) return { error: "Marketplace not found", status: 404 };
  if (!body.productSku) return { error: "productSku required", status: 400 };

  if (String(body.status || "draft") !== "draft" || body.validateListing === true) {
    const preflight = preflightListing(body);
    if (!preflight.ok) {
      return {
        error: "LISTING_VALIDATION_FAILED",
        status: 422,
        issues: preflight.validation.issues,
        preflight,
      };
    }
  }

  db.prepare(`
    INSERT INTO marketplace_listings(marketplace_id, product_sku, channel_sku, title, price, currency, stock, status)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(marketplace_id, product_sku) DO UPDATE SET
      channel_sku = excluded.channel_sku,
      title = excluded.title,
      price = excluded.price,
      currency = excluded.currency,
      stock = excluded.stock,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    marketplace.id,
    body.productSku,
    body.channelSku || body.productSku,
    body.title || "",
    Number(body.price || 0),
    body.currency || "EUR",
    Number(body.stock || 0),
    body.status || "draft"
  );

  return { ok: true };
}

function upsertSkuMapping(body = {}) {
  const marketplace = db.prepare("SELECT id FROM marketplace_channels WHERE code = ?").get(body.marketplace);
  if (!marketplace) return { error: "Marketplace not found", status: 404 };
  if (!body.productSku || !body.channelSku) {
    return { error: "productSku and channelSku required", status: 400 };
  }

  db.prepare(`
    INSERT INTO marketplace_sku_mappings(marketplace_id, product_sku, channel_sku)
    VALUES(?,?,?)
    ON CONFLICT(marketplace_id, product_sku) DO UPDATE SET channel_sku = excluded.channel_sku
  `).run(marketplace.id, body.productSku, body.channelSku);

  return { ok: true };
}

function listSyncJobs() {
  return db
    .prepare(`
      SELECT j.*, m.code marketplace, m.name marketplace_name
      FROM marketplace_sync_jobs j
      LEFT JOIN marketplace_channels m ON m.id = j.marketplace_id
      ORDER BY j.id DESC
      LIMIT 200
    `)
    .all();
}

function updateSyncJobResult(jobId, body = {}) {
  const job = db.prepare("SELECT id FROM marketplace_sync_jobs WHERE id = ?").get(jobId);
  if (!job) return { error: "Sync job not found", status: 404 };
  db.prepare(`
    UPDATE marketplace_sync_jobs
    SET status = ?, attempts = attempts + 1, error_message = ?, finished_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(body.status === "success" ? "success" : "failed", body.error || null, jobId);
  return { ok: true };
}

function listChannelOrders() {
  return db
    .prepare(`
      SELECT o.*, m.code marketplace
      FROM marketplace_channel_orders o
      LEFT JOIN marketplace_channels m ON m.id = o.marketplace_id
      ORDER BY imported_at DESC
      LIMIT 200
    `)
    .all();
}

function importOrderWebhook(body = {}) {
  const webhookInput = require("./webhookInput");
  const code = webhookInput.token(body.marketplace);
  const marketplace = code ? db.prepare("SELECT id FROM marketplace_channels WHERE code = ?").get(code) : null;
  if (!marketplace || !body.externalOrderId) {
    return { error: "marketplace and externalOrderId required", status: 400 };
  }
  const order = {
    externalOrderId: webhookInput.identifier(body.externalOrderId),
    internalOrderNumber: body.internalOrderNumber ? webhookInput.identifier(body.internalOrderNumber) : "",
    status: body.status === undefined ? "imported" : webhookInput.token(body.status),
    total: webhookInput.amount(body.total),
    currency: webhookInput.currency(body.currency),
    customerCountry: body.customerCountry ? (/^[A-Za-z]{2}$/.test(String(body.customerCountry)) ? String(body.customerCountry).toUpperCase() : null) : "",
  };
  if (Object.values(order).some((value) => value === null)) return webhookInput.INVALID;
  body = { ...order, internalOrderNumber: order.internalOrderNumber || null };
  try {
    db.prepare(`
      INSERT INTO marketplace_channel_orders(marketplace_id, external_order_id, internal_order_number, status, total, currency, customer_country)
      VALUES(?,?,?,?,?,?,?)
    `).run(
      marketplace.id,
      body.externalOrderId,
      body.internalOrderNumber || null,
      body.status || "imported",
      Number(body.total || 0),
      body.currency || "EUR",
      body.customerCountry || ""
    );
  } catch {
    /* idempotent */
  }
  return { ok: true, status: 202 };
}

function getMarketplaceHubStatus() {
  return {
    version: "1.5.0",
    enabled: isEnabled(),
    channels: CHANNELS.length,
    connectors: connectorSnapshot(),
    totals: {
      marketplaces: db.prepare("SELECT COUNT(*) n FROM marketplace_channels").get().n,
      listings: db.prepare("SELECT COUNT(*) n FROM marketplace_listings").get().n,
      syncJobs: db.prepare("SELECT COUNT(*) n FROM marketplace_sync_jobs").get().n,
      channelOrders: db.prepare("SELECT COUNT(*) n FROM marketplace_channel_orders").get().n,
      queuedJobs: db
        .prepare("SELECT COUNT(*) n FROM marketplace_sync_jobs WHERE status = 'queued'")
        .get().n,
    },
  };
}

module.exports = {
  isEnabled,
  CHANNELS,
  listMarketplaces,
  updateMarketplace,
  queueStockSync,
  queuePriceSync,
  queueOrderSync,
  upsertListing,
  upsertSkuMapping,
  listSyncJobs,
  updateSyncJobResult,
  listChannelOrders,
  importOrderWebhook,
  getMarketplaceHubStatus,
  preflightListing,
};
