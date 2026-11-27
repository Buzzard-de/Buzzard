const { isSalesEnabled } = require("../../salesMode");
const { CHANNELS, createConnector } = require("../marketplaceConnectorRegistry");
const { createEuropeAdapter } = require("./adapter");
const { decisionFor, planListing, resolveTarget } = require("./categoryInventory");
const { priceFromEngines, stockFromEngine } = require("./pricingGate");

const REGISTRY = new Set(CHANNELS.map((channel) => channel.id));
const seenOrders = new Set();

const EXTERNAL = new Set([
  "API_NOT_VERIFIED",
  "SELLER_ACCESS_REQUIRED",
  "ENDPOINT_NOT_VERIFIED",
  "CREDENTIALS_MISSING",
  "CONNECTOR_DISABLED",
  "BASE_URL_REQUIRED",
  "USER_AGENT_REQUIRED",
  "ACCESS_TOKEN_INVALID",
  "SANDBOX_HOST_REQUIRED",
  "MARKETPLACE_CATEGORY_UNMAPPED",
  "MARKETPLACE_ATTRIBUTES_UNCONFIRMED",
]);

function productFrom(input = {}) {
  const source = input.product || input;
  const category = source.buzzardCategory || (/^bz\.\d+$/.test(String(source.category || "")) ? source.category : null);
  return {
    sku: String(source.sku || source.productSku || "").trim(),
    title: String(source.title || "").trim(),
    ean: String(source.ean || source.gtin || "").trim(),
    mpn: String(source.mpn || "").trim(),
    imageLink: source.imageLink || source.image_link || "",
    buzzardCategory: category,
    quantity: source.quantity != null ? source.quantity : source.stock,
    supplier: source.supplier || "catalog",
  };
}

function seal(result) {
  return {
    ...result,
    live: false,
    network: false,
    productionReady: false,
    publish: false,
    salesEnabled: isSalesEnabled(),
    orderCreated: result.orderCreated === true,
  };
}

function external(result) {
  if (!result || !EXTERNAL.has(result.code)) return result;
  return { ...result, ok: false, code: "BLOCKED_EXTERNAL_DEPENDENCY", reason: result.code };
}

function listingPlan(input) {
  const product = productFrom(input);
  const target = resolveTarget(input.platform || input.marketplace);
  if (!target) return { ok: false, code: "PLATFORM_UNKNOWN", product };
  const plan = planListing({
    platform: input.platform || input.marketplace,
    buzzardCategory: product.buzzardCategory,
    country: input.country,
    marketplaceCategoryId: input.marketplaceCategoryId,
    marketplaceAttributesConfirmed: input.marketplaceAttributesConfirmed,
    attributes: { sku: product.sku, title: product.title, ...(input.attributes || {}) },
    condition: input.condition,
  });
  return { ...plan, product, platformId: target.platform.id, family: target.platform.family };
}

function preflight(body = {}) {
  const plan = listingPlan(body);
  if (plan.code === "PLATFORM_UNKNOWN") return seal(plan);
  return seal(external(plan));
}

async function prepareListing(input = {}) {
  const plan = listingPlan(input);
  if (!plan.ok) return seal(external(plan));
  const priced = priceFromEngines({ ...input, sku: plan.product.sku, country: input.country, category: plan.product.buzzardCategory });
  if (!priced.ok) return seal({ ...priced, platformId: plan.platformId, publish: false });
  const stock = stockFromEngine({ ...input, sku: plan.product.sku, quantity: input.quantity != null ? input.quantity : plan.product.quantity });
  if (!stock.ok) return seal({ ...stock, platformId: plan.platformId, publish: false });
  const offer = {
    ...input,
    sku: plan.product.sku,
    productId: input.productId || plan.product.ean,
    country: input.country,
    quantity: stock.quantity,
    salePrice: priced.salePrice,
  };
  if (REGISTRY.has(plan.platformId)) {
    const connector = createConnector(plan.platformId);
    const decision = await connector.publishListing({
      sku: offer.sku,
      title: plan.product.title,
      gtin: plan.product.ean,
      mpn: plan.product.mpn,
      image_link: plan.product.imageLink,
    });
    return seal({ ...decision, platformId: plan.platformId, category: plan.code, orderCreated: false });
  }
  const adapter = europeAdapter(plan.platformId, input);
  const health = adapter.health();
  if (health.credentials.apiKey === "missing" && health.credentials.accessToken === "missing" && health.credentials.sellerId === "missing") {
    return seal(external({ ok: false, code: "CREDENTIALS_MISSING", platformId: plan.platformId }));
  }
  if (!input.transport) return seal({ ok: false, code: "LIVE_PUBLISH_CLOSED", platformId: plan.platformId, category: plan.code });
  const sent = await adapter.updateOffer(offer);
  return seal(external({ ...sent, platformId: plan.platformId, category: plan.code, orderCreated: false }));
}

function europeAdapter(platformId, input) {
  return createEuropeAdapter(platformId, { env: input.env || process.env, transport: input.transport || null });
}

function rememberOrder(draft) {
  if (!draft.ok) return draft;
  const key = `${draft.platformId}:${draft.externalOrderId}`;
  if (seenOrders.has(key)) return { ...draft, ok: false, code: "DUPLICATE_ORDER", persisted: false, orderCreated: false };
  seenOrders.add(key);
  return draft;
}

async function routeOrder(input = {}) {
  const named = input.platform || input.marketplace;
  if (named === "trendyol" || named === "Trendyol") {
    const connector = createConnector("trendyol");
    const imported = await connector.importOrders({});
    return seal({ ...imported, platformId: "trendyol", adapterAttached: Boolean(connector.adapter), orderCreated: false });
  }
  const target = resolveTarget(named);
  if (!target) return seal({ ok: false, code: "PLATFORM_UNKNOWN", orderCreated: false });
  if (REGISTRY.has(target.platform.id)) {
    const connector = createConnector(target.platform.id);
    const imported = await connector.importOrders(input.order || {});
    return seal({ ...imported, platformId: target.platform.id, orderCreated: false });
  }
  const decision = decisionFor(target.platform);
  if (!decision.catalogListing) return seal(external({ ok: false, code: decision.code, platformId: target.platform.id, orderCreated: false }));
  const adapter = europeAdapter(target.platform.id, input);
  if (input.order) return seal(rememberOrder({ ...adapter.ingestOrder(input.order), platformId: target.platform.id }));
  const read = await adapter.readOrders({ country: input.country });
  return seal(external({ ...read, platformId: target.platform.id, orderCreated: false }));
}

module.exports = { preflight, prepareListing, routeOrder, productFrom };
