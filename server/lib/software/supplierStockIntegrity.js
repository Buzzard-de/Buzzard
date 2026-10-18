/**
 * Supplier and stock integrity — local software only.
 * Never sends a purchase order, never fetches live supplier HTTP,
 * never treats outage/malformed/stale as stock, never buys own stock.
 * Inter-Cars and TecDoc stay BLOCKED_EXTERNAL. €0.10 undercut stays unimplemented.
 */

const { isSalesEnabled } = require("../salesMode");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_IMPLEMENTED, MARKET_UNDERCUT_EUR } = require("../pusat/constants");
const stockEngine = require("../operations/stockEngine");
const pricing = require("./pricing");
const inventory = require("./inventory");
const supplierFeeds = require("./supplierFeeds");
const connectorInventory = require("./connectorInventory");
const interCarsAdapter = require("../adapters/interCarsAdapter");
const tecdocAdapter = require("../adapters/tecdocAdapter");

function inspect() {
  const flags = getEffectiveFlags();
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    supplierOrdersEnabled: flags.supplierOrdersEnabled === true,
    purchaseOwnStock: false,
    speculativeBuy: false,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
    marketUndercutEur: MARKET_UNDERCUT_EUR,
    reservationAuthorities: ["commerce_software", "wms_location"],
    sharedReservationAuthority: false,
  };
}

function purchaseOrder(input = {}) {
  return interCarsAdapter.purchaseOrder(input);
}

function fetchLiveFeed(input = {}) {
  return supplierFeeds.rejectLiveFetch(input.url || input.href || "https://supplier.example/feed");
}

function importLiveFeed(input = {}) {
  const preview = supplierFeeds.preview({
    format: input.format || "json",
    payload: input.payload || "[]",
    url: input.url,
    supplierId: input.supplierId,
  });
  return {
    ...preview,
    persist: false,
    mutated: false,
    importReady: false,
    written: false,
    live: false,
  };
}

function confirmLiveStock() {
  return {
    ok: false,
    proven: false,
    live: false,
    inStock: false,
    inventedStock: false,
    purchaseOwnStock: false,
    reason: "LIVE_STOCK_UNKNOWN",
  };
}

function inventStock() {
  return {
    ok: false,
    invented: false,
    live: false,
    quantity: null,
    purchaseOwnStock: false,
    reason: "INVENTED_STOCK_BLOCKED",
  };
}

function syncLiveInventory() {
  return {
    ok: false,
    synced: false,
    live: false,
    purchaseOwnStock: false,
    reason: "LIVE_INVENTORY_SYNC_BLOCKED",
  };
}

function classifyAvailability(row = {}, context = {}) {
  return {
    ...supplierFeeds.classifyAvailability(row, context),
    live: false,
    purchaseOwnStock: false,
  };
}

function treatOutageAsStock(input = {}) {
  const classified = supplierFeeds.classifyOutage(input);
  return {
    ...classified,
    treatAsStock: false,
    purchasable: false,
    live: false,
    purchaseOwnStock: false,
  };
}

function evaluateLocalStock(record = {}, options = {}) {
  const evaluated = stockEngine.evaluateStockRecord(record, options);
  return {
    ...evaluated,
    live: false,
    invented: false,
    purchaseOwnStock: false,
  };
}

function reservationAuthorities() {
  return {
    commerce: "software.inventory / software_reservations",
    wms: "wmsInventory / wms_reservations",
    sharedAuthority: false,
    purchaseOwnStock: false,
    note: "WMS location reserves do not mint commerce reservations.",
  };
}

function applyUndercut() {
  return {
    ok: false,
    applied: false,
    implemented: MARKET_UNDERCUT_IMPLEMENTED,
    amountEur: MARKET_UNDERCUT_EUR,
    reason: "MARKET_UNDERCUT_NOT_IMPLEMENTED",
  };
}

function quoteProfit(input = {}) {
  const quoted = pricing.quote(input);
  return {
    ...quoted,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    undercutApplied: false,
    live: false,
    published: false,
  };
}

function convertCurrency(input = {}) {
  const from = String(input.from || input.currency || "EUR").trim().toUpperCase();
  const to = String(input.to || "").trim().toUpperCase();
  if (!to || from === to) {
    return { ok: from === "EUR" && (!to || to === "EUR"), from, to: to || from, converted: false, invented: false, live: false };
  }
  return {
    ok: false,
    from,
    to,
    converted: false,
    invented: false,
    live: false,
    reason: "FX_RATE_NOT_INVENTED",
  };
}

function priceSnapshot(input = {}) {
  const quoted = quoteProfit(input);
  return {
    ok: quoted.ok === true,
    live: false,
    liveVerified: false,
    snapshot: quoted.ok
      ? {
          salePrice: quoted.salePrice,
          currency: quoted.currency,
          netProfit: quoted.netProfit,
          precise: quoted.precise,
        }
      : null,
    invented: false,
    reason: quoted.ok ? null : quoted.reason,
  };
}

function connectorHonesty() {
  return {
    suppliers: connectorInventory.supplierConnectors(),
    liveReady: false,
    liveVerified: false,
    interCars: interCarsAdapter.describeStatus(),
    tecdoc: tecdocAdapter.describeStatus(),
  };
}

function confirmInterCarsLive() {
  const availability = interCarsAdapter.confirmAvailability();
  const po = interCarsAdapter.purchaseOrder({ forcePurchase: true, actor: "operator" });
  return {
    live: false,
    httpAttempted: false,
    availabilityReason: availability.reason,
    purchaseReason: po.reason,
    blocked: "BLOCKED_EXTERNAL_DEPENDENCY",
  };
}

function confirmTecDocLive() {
  const catalog = tecdocAdapter.confirmLiveCatalog();
  return {
    live: false,
    httpAttempted: false,
    reason: catalog.reason,
    blocked: "BLOCKED_EXTERNAL_DEPENDENCY",
  };
}

function retryPolicy(kind) {
  const financial = kind === "purchase_order" || kind === "payment_or_refund";
  return {
    kind,
    retry: !financial,
    live: false,
    reason: financial ? "FINANCIAL_NO_RETRY" : "LOCAL_FEED_RETRY_ONLY",
  };
}

module.exports = {
  inspect,
  purchaseOrder,
  fetchLiveFeed,
  importLiveFeed,
  confirmLiveStock,
  inventStock,
  syncLiveInventory,
  classifyAvailability,
  treatOutageAsStock,
  evaluateLocalStock,
  reservationAuthorities,
  applyUndercut,
  quoteProfit,
  convertCurrency,
  priceSnapshot,
  connectorHonesty,
  confirmInterCarsLive,
  confirmTecDocLive,
  retryPolicy,
  inventory,
};
