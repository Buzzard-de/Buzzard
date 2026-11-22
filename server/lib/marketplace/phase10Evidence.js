/**
 * Phase 10 marketplace evidence. Calls the existing registry, hub, feed, and pricing functions.
 * Synthetic rows only. No live publish.
 */
const os = require("os");
const path = require("path");
const { db } = require("../db");
const { resolveDbPath } = require("../dbPaths");
const {
  CHANNELS,
  createConnector,
  snapshot,
} = require("./marketplaceConnectorRegistry");
const hub = require("../marketplaceHub");
const { validateMarketplaceListing, buildEligibleFeedItems } = require("../storefront/merchantFeedService");
const { dryMarketplaceCommission, autoQuoteFromSupplierRecord } = require("../pricing/pricingAutomationService");
const { evaluateCommercialStock } = require("../commerce/commercialCore");
const { estimateVat } = require("../commerce/ab27Tax");

const SKU = "PHASE10-SYN-001";
const CHANNEL_SKU = "AMZ-PHASE10-SYN-001";
const ORDER_ID = "PHASE10-SYN-ORDER";
const VALID_LISTING = Object.freeze({
  sku: SKU,
  title: "Synthetic brake pad",
  gtin: "5901234123457",
  mpn: "P85073",
  image_link: "https://cdn.test-supplier.example.de/p85073.jpg",
});

function writesAllowed() {
  const resolved = path.resolve(resolveDbPath());
  if (resolved.includes(`${path.sep}workspace${path.sep}`)) return false;
  if (path.basename(resolved) === "buzzard.db" && resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) return false;
  return process.env.VITEST === "true" || resolved.startsWith(`${os.tmpdir()}${path.sep}`) || resolved.startsWith("/tmp/");
}

function readListing() {
  return db.prepare(`
    SELECT l.product_sku, l.channel_sku, l.title, l.price, l.currency, l.stock, l.status, m.code
    FROM marketplace_listings l
    JOIN marketplace_channels m ON m.id = l.marketplace_id
    WHERE l.product_sku = ? AND m.code = 'amazon'
  `).get(SKU);
}

function readOrderCount() {
  return db.prepare(`
    SELECT COUNT(*) n
    FROM marketplace_channel_orders o
    JOIN marketplace_channels m ON m.id = o.marketplace_id
    WHERE o.external_order_id = ? AND m.code = 'amazon'
  `).get(ORDER_ID).n;
}

function readOrder() {
  return db.prepare(`
    SELECT o.status, o.customer_country, o.currency, o.total
    FROM marketplace_channel_orders o
    JOIN marketplace_channels m ON m.id = o.marketplace_id
    WHERE o.external_order_id = ? AND m.code = 'amazon'
  `).get(ORDER_ID);
}

function withAmazonEnv(fn) {
  const keys = ["AMAZON_SP_API_CLIENT_ID", "AMAZON_PUBLISH_ALLOWED"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (previous[key] == null) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function registryEvidence() {
  const snap = snapshot();
  const ids = new Set(CHANNELS.map((channel) => channel.id));
  const rows = Array.isArray(snap.connectors) ? snap.connectors : [];
  const known = rows.length === CHANNELS.length && rows.every((row) => ids.has(row.id) && row.live === false && row.publishAllowed === false);
  return {
    ok: known && snap.channelCount === rows.length && snap.anyLive === false && snap.allBlocked === true && snap.productionReady === false,
    count: rows.length,
    anyLive: snap.anyLive,
    allBlocked: snap.allBlocked,
  };
}

function accountEvidence() {
  return withAmazonEnv(() => {
    delete process.env.AMAZON_SP_API_CLIENT_ID;
    delete process.env.AMAZON_PUBLISH_ALLOWED;
    const missing = createConnector("amazon");
    const unknown = createConnector("not-a-marketplace");
    process.env.AMAZON_SP_API_CLIENT_ID = "short";
    const shortKey = createConnector("amazon");
    process.env.AMAZON_PUBLISH_ALLOWED = "1";
    const flagWithoutCredential = createConnector("amazon");
    const hubMissing = hub.updateMarketplace("not-a-marketplace", { enabled: true });
    return {
      ok: missing.ok !== false
        && missing.credentialsConfigured === false
        && missing.publishAllowed === false
        && missing.live === false
        && unknown.ok === false
        && unknown.code === "CHANNEL_UNKNOWN"
        && shortKey.credentialsConfigured === false
        && shortKey.publishAllowed === false
        && flagWithoutCredential.publishAllowed === false
        && hubMissing.status === 404,
      unknownCode: unknown.code,
      hubStatus: hubMissing.status,
    };
  });
}

function listingEvidence() {
  const valid = validateMarketplaceListing(VALID_LISTING);
  const invalidGtin = validateMarketplaceListing({ ...VALID_LISTING, gtin: "123" });
  const missingImage = validateMarketplaceListing({ ...VALID_LISTING, image_link: "" });
  const preflight = hub.preflightListing({
    marketplace: "amazon",
    productSku: VALID_LISTING.sku,
    title: VALID_LISTING.title,
    gtin: VALID_LISTING.gtin,
    mpn: VALID_LISTING.mpn,
    imageLink: VALID_LISTING.image_link,
  });
  const amazon = createConnector("amazon");
  const decision = amazon.publishDecision(VALID_LISTING);
  const mapped = hub.upsertSkuMapping({ marketplace: "amazon", productSku: SKU, channelSku: CHANNEL_SKU });
  const drafted = hub.upsertListing({
    marketplace: "amazon",
    productSku: SKU,
    channelSku: CHANNEL_SKU,
    title: VALID_LISTING.title,
    price: 49.5,
    currency: "EUR",
    stock: 4,
    status: "draft",
  });
  const stored = readListing();
  const mapping = db.prepare(`
    SELECT channel_sku FROM marketplace_sku_mappings map
    JOIN marketplace_channels m ON m.id = map.marketplace_id
    WHERE map.product_sku = ? AND m.code = 'amazon'
  `).get(SKU);
  return {
    ok: valid.ok === true
      && valid.publishAllowed === false
      && valid.live === false
      && invalidGtin.ok === false
      && invalidGtin.issues.length > 0
      && missingImage.ok === false
      && missingImage.issues.includes("IMAGE_MISSING")
      && preflight.ok === true
      && preflight.validation.ok === true
      && preflight.live === false
      && preflight.publishAllowed === false
      && decision.ok === false
      && decision.code === "LIVE_CONNECTION_BLOCKED"
      && decision.live === false
      && mapped.ok === true
      && drafted.ok === true
      && stored?.channel_sku === CHANNEL_SKU
      && stored.title === VALID_LISTING.title
      && stored.price === 49.5
      && stored.currency === "EUR"
      && stored.stock === 4
      && stored.status === "draft"
      && mapping?.channel_sku === CHANNEL_SKU,
    invalidAccepted: invalidGtin.ok === true,
    publishCode: decision.code,
    mappedSku: stored?.channel_sku || null,
  };
}

function priceEvidence() {
  const amazon = dryMarketplaceCommission({ channel: "amazon", gross: 100 });
  const ebay = dryMarketplaceCommission({ channel: "ebay", gross: 100 });
  const record = {
    supplier_price: { amount: 40, currency: "EUR" },
    comparable_market_price: 90,
    return_reserve: 1,
    other_cost: 0,
  };
  const de = autoQuoteFromSupplierRecord(record, { country: "DE", marketplace: "amazon", category: { activeCategoryId: "cat-05", slug: "automotive" } });
  const fr = autoQuoteFromSupplierRecord(record, { country: "FR", marketplace: "amazon", category: { activeCategoryId: "cat-05", slug: "automotive" } });
  const unknownVat = estimateVat({ country: "ZZ", netAmount: 40 });
  return {
    ok: amazon.ok === true
      && ebay.ok === true
      && amazon.live === false
      && ebay.live === false
      && amazon.fee === 15
      && ebay.fee === 12
      && amazon.fee !== ebay.fee
      && de.livePriceWrite === false
      && fr.livePriceWrite === false
      && de.quote.vatRate === 19
      && fr.quote.vatRate === 20
      && de.quote.vat !== fr.quote.vat
      && unknownVat.ok === false
      && unknownVat.code === "VAT_UNKNOWN",
    amazonFee: amazon.fee,
    ebayFee: ebay.fee,
    deRate: de.quote.vatRate,
    frRate: fr.quote.vatRate,
    unknownVat: unknownVat.code,
  };
}

function stockEvidence() {
  const fresh = new Date().toISOString();
  const available = evaluateCommercialStock({ supplierStock: 4, reservedStock: 1, updatedAt: fresh });
  const unavailable = evaluateCommercialStock({ supplierStock: 0, reservedStock: 0, updatedAt: fresh });
  const cleared = hub.upsertListing({
    marketplace: "amazon",
    productSku: SKU,
    channelSku: CHANNEL_SKU,
    title: VALID_LISTING.title,
    price: 49.5,
    currency: "EUR",
    stock: 0,
    status: "draft",
  });
  const stored = readListing();
  const queued = hub.queueStockSync();
  const jobs = hub.listSyncJobs().filter((job) => job.entity_key === SKU && job.job_type === "stock" && job.status === "queued");
  return {
    ok: available.ok === true
      && available.availableStock === 3
      && available.sellable === true
      && available.sync.liveSync === false
      && unavailable.ok === false
      && unavailable.sellable === false
      && unavailable.outOfStock === true
      && cleared.ok === true
      && stored?.stock === 0
      && queued.queued >= 1
      && jobs.length >= 1,
    availableStock: available.availableStock,
    unavailable: unavailable.sellable === false,
    queued: queued.queued,
    jobId: jobs[0]?.id || null,
  };
}

function orderEvidence() {
  const imported = hub.importOrderWebhook({
    marketplace: "amazon",
    externalOrderId: ORDER_ID,
    status: "imported",
    total: 12.5,
    currency: "eur",
    customerCountry: "de",
  });
  const duplicate = hub.importOrderWebhook({
    marketplace: "amazon",
    externalOrderId: ORDER_ID,
    status: "imported",
    total: 99,
    currency: "EUR",
    customerCountry: "FR",
  });
  const row = readOrder();
  return {
    ok: imported.ok === true
      && imported.status === 202
      && duplicate.ok === true
      && readOrderCount() === 1
      && row?.status === "imported"
      && row?.customer_country === "DE"
      && row?.currency === "EUR"
      && row?.total === 12.5,
    count: readOrderCount(),
    status: row?.status || null,
  };
}

function rejectionEvidence() {
  const unknownPreflight = hub.preflightListing({ marketplace: "unknown_channel_xyz", productSku: "A", title: "Test title" });
  const missingSku = hub.upsertListing({ marketplace: "amazon" });
  const missingMap = hub.upsertSkuMapping({ marketplace: "amazon", productSku: SKU });
  const missingOrder = hub.importOrderWebhook({ marketplace: "amazon" });
  const badCountry = hub.importOrderWebhook({
    marketplace: "amazon",
    externalOrderId: "PHASE10-SYN-BAD",
    customerCountry: "Deutschland",
    total: 10,
  });
  const badTotal = hub.importOrderWebhook({
    marketplace: "amazon",
    externalOrderId: "PHASE10-SYN-BAD",
    customerCountry: "DE",
    total: -1,
  });
  const unknownJob = hub.updateSyncJobResult(2147483646, { status: "success" });
  return {
    ok: unknownPreflight.ok === false
      && unknownPreflight.code === "CHANNEL_UNKNOWN"
      && missingSku.status === 400
      && missingMap.status === 400
      && missingOrder.status === 400
      && badCountry.status === 400
      && badTotal.status === 400
      && unknownJob.status === 404,
    unknownCode: unknownPreflight.code,
  };
}

function retryEvidence(jobId) {
  if (!jobId) return { ok: false, attempts: 0 };
  const first = hub.updateSyncJobResult(jobId, { status: "failed", error: "SYNTHETIC_FAULT" });
  const second = hub.updateSyncJobResult(jobId, { status: "failed", error: "SYNTHETIC_RETRY" });
  const row = db.prepare("SELECT status, attempts, error_message FROM marketplace_sync_jobs WHERE id = ?").get(jobId);
  return {
    ok: first.ok === true && second.ok === true && row?.status === "failed" && row.attempts === 2 && row.error_message === "SYNTHETIC_RETRY",
    attempts: row?.attempts ?? 0,
    status: row?.status || null,
  };
}

function localeEvidence() {
  const de = buildEligibleFeedItems({ locale: "de-DE", country: "de", currency: "EUR" });
  const fr = buildEligibleFeedItems({ locale: "fr-FR", country: "fr", currency: "EUR" });
  return {
    ok: de.locale === "de-DE"
      && fr.locale === "fr-FR"
      && de.country === "DE"
      && fr.country === "FR"
      && de.currency === "EUR"
      && fr.currency === "EUR"
      && de.salesEnabled === false
      && fr.salesEnabled === false
      && de.locale !== fr.locale
      && de.country !== fr.country,
    de: de.locale,
    fr: fr.locale,
    deCountry: de.country,
    frCountry: fr.country,
  };
}

function credentialEvidence() {
  return withAmazonEnv(() => {
    delete process.env.AMAZON_SP_API_CLIENT_ID;
    delete process.env.AMAZON_PUBLISH_ALLOWED;
    const bare = createConnector("amazon").publishDecision(VALID_LISTING);
    process.env.AMAZON_SP_API_CLIENT_ID = "synthetic-phase10-credential";
    const credentialOnly = createConnector("amazon");
    const credentialDecision = credentialOnly.publishDecision(VALID_LISTING);
    process.env.AMAZON_PUBLISH_ALLOWED = "1";
    const armed = createConnector("amazon");
    const armedDecision = armed.publishDecision(VALID_LISTING);
    const liveSuccess = bare.ok === true || bare.live === true || credentialDecision.ok === true || armedDecision.ok === true || armedDecision.live === true;
    return {
      ok: bare.code === "LIVE_CONNECTION_BLOCKED"
        && bare.live === false
        && credentialOnly.credentialsConfigured === true
        && credentialOnly.publishAllowed === false
        && credentialDecision.code === "LIVE_CONNECTION_BLOCKED"
        && armed.publishAllowed === true
        && armedDecision.ok === false
        && armedDecision.code === "HUMAN_APPROVAL_REQUIRED"
        && armedDecision.live === false
        && liveSuccess === false,
      liveSuccess,
      armedLive: armedDecision.live === true,
      armedCode: armedDecision.code,
    };
  });
}

function runPhase10Evidence() {
  if (!writesAllowed()) {
    return {
      ok: false,
      code: "REFUSED_PRODUCTION_DB",
      registry: { ok: false, count: 0 },
      account: { ok: false },
      listing: { ok: false, invalidAccepted: true },
      price: { ok: false },
      stock: { ok: false },
      orders: { ok: false },
      rejection: { ok: false },
      retry: { ok: false, attempts: 0 },
      locale: { ok: false },
      credentials: { ok: false, liveSuccess: true, armedLive: true },
      live: false,
      productionReady: false,
    };
  }
  const registry = registryEvidence();
  const account = accountEvidence();
  const listing = listingEvidence();
  const price = priceEvidence();
  const stock = stockEvidence();
  const orders = orderEvidence();
  const rejection = rejectionEvidence();
  const retry = retryEvidence(stock.jobId);
  const locale = localeEvidence();
  const credentials = credentialEvidence();
  const parts = [registry, account, listing, price, stock, orders, rejection, retry, locale, credentials];
  return {
    ok: parts.every((part) => part.ok === true) && credentials.liveSuccess === false,
    registry,
    account,
    listing,
    price,
    stock,
    orders,
    rejection,
    retry,
    locale,
    credentials,
    live: false,
    productionReady: false,
  };
}

module.exports = { runPhase10Evidence, SKU, ORDER_ID };
