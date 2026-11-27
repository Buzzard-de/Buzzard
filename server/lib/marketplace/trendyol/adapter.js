const crypto = require("crypto");
const contract = require("./contract");
const { readConfig, publicView } = require("./config");
const { createRateLimiter, createIdempotency, execute } = require("./client");
const { mapProductBatch } = require("./mapProduct");
const { mapPriceStockBatch } = require("./mapPriceStock");
const { toOrderDraft, trackingPayload, toReturnDraft, readBatchResult } = require("./mapOrder");

function payloadKey(body) {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function createTrendyolAdapter({ env = process.env, transport = null, now, sleep, limits } = {}) {
  const config = readConfig(env);
  const limiter = createRateLimiter({ now, limits });
  const idempotency = createIdempotency();
  const logs = [];
  const orders = createIdempotency();

  function health() {
    return publicView(config);
  }

  async function send(spec) {
    return execute(config, spec, transport, { limiter, sleep, logs, idempotency });
  }

  async function createProducts(products) {
    const mapped = mapProductBatch(products, config.storeFrontCode);
    if (!mapped.ok) return mapped;
    const result = await send({
      method: "POST",
      path: contract.productCreatePath(config.sellerId),
      body: mapped.body,
      group: "productWritePerMinute",
      idempotencyKey: payloadKey(mapped.body),
    });
    return { ...result, mapped: mapped.body, version: "v2" };
  }

  async function updatePriceAndStock(rows) {
    const mapped = mapPriceStockBatch(rows);
    if (!mapped.ok) return mapped;
    const result = await send({
      method: "POST",
      path: contract.priceAndInventoryPath(config.sellerId),
      body: mapped.body,
      group: "inventoryPerMinute",
      barcode: mapped.body.items.length === 1 ? mapped.body.items[0].barcode : undefined,
      idempotencyKey: payloadKey(mapped.body),
    });
    return { ...result, mapped: mapped.body };
  }

  function ingestPackage(pkg) {
    const draft = toOrderDraft(pkg, { storeFrontCode: config.storeFrontCode });
    if (!draft.ok) return draft;
    const prior = orders.remember("package", draft.externalPackageId, draft);
    if (prior.duplicate) {
      return { ok: false, code: "DUPLICATE_ORDER", externalPackageId: draft.externalPackageId, live: false, orderCreated: false };
    }
    return draft;
  }

  function ingestPackages(packages) {
    const drafts = [];
    const rejected = [];
    for (const pkg of packages || []) {
      const row = ingestPackage(pkg);
      if (row.ok) drafts.push(row);
      else rejected.push(row);
    }
    return { ok: rejected.length === 0, drafts, rejected, live: false, orderCreated: false };
  }

  async function pollOrders(query = {}) {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.startDate) params.set("startDate", String(query.startDate));
    if (query.endDate) params.set("endDate", String(query.endDate));
    params.set("orderByField", "PackageLastModifiedDate");
    params.set("orderByDirection", "DESC");
    params.set("size", String(query.size || 50));
    const result = await send({
      method: "GET",
      path: `${contract.ordersPath(config.sellerId)}?${params.toString()}`,
      group: "orderReadPerMinute",
    });
    if (!result.ok) return { ...result, drafts: [] };
    const content = result.body?.content || [];
    const ingested = ingestPackages(content);
    return { ...result, ...ingested, version: "v2" };
  }

  async function updateTracking(input) {
    const mapped = trackingPayload(input);
    if (!mapped.ok) return mapped;
    return send({
      method: "PUT",
      path: contract.trackingPath(config.sellerId, input.packageId),
      body: mapped.body,
      group: "productWritePerMinute",
    });
  }

  function ingestClaim(claim) {
    return toReturnDraft(claim);
  }

  function explainBatch(body) {
    return readBatchResult(body);
  }

  function registerWebhook() {
    return { ok: false, code: "WEBHOOK_REGISTRATION_BLOCKED", live: false, network: false };
  }

  async function cancelItems(input = {}) {
    if (input.packageId == null || !Array.isArray(input.lines) || input.lines.length === 0) {
      return { ok: false, code: "CANCEL_INPUT_INVALID", live: false, network: false };
    }
    return send({
      method: "PUT",
      path: contract.cancelPath(config.sellerId, input.packageId),
      body: {
        lines: input.lines,
        reasonId: input.reasonId,
        shouldKeepPreviousStatus: input.shouldKeepPreviousStatus === true,
      },
      group: "productWritePerMinute",
    });
  }

  async function sendInvoiceLink(input = {}) {
    const invoiceLink = String(input.invoiceLink || "");
    if (!invoiceLink.startsWith("https://") || input.shipmentPackageId == null) {
      return { ok: false, code: "INVOICE_INPUT_INVALID", live: false, network: false };
    }
    return send({
      method: "POST",
      path: contract.invoiceLinkPath(config.sellerId),
      body: { invoiceLink, shipmentPackageId: input.shipmentPackageId },
      group: "productWritePerMinute",
    });
  }

  return {
    id: "trendyol",
    health,
    logs: () => logs.map((entry) => ({ ...entry })),
    createProducts,
    updatePriceAndStock,
    ingestPackage,
    ingestPackages,
    pollOrders,
    updateTracking,
    ingestClaim,
    explainBatch,
    registerWebhook,
    cancelItems,
    sendInvoiceLink,
  };
}

module.exports = { createTrendyolAdapter };
