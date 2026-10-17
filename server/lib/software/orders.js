/**
 * Isolated order / PO draft path. Never sends a commercial order or supplier PO.
 */

const { isSalesEnabled } = require("../salesMode");
const { quote } = require("./pricing");
const { evaluateReliability } = require("./inventory");
const productValidator = require("../productValidator");

function createDraft(input = {}) {
  const salesEnabled = isSalesEnabled();
  const price = quote({
    supplierCost: input.supplierCost,
    shippingCost: input.shippingCost,
    extraCosts: input.extraCosts,
    returnReserve: input.returnReserve,
    marketplaceCommissionRate: input.marketplaceCommissionRate,
    taxRate: input.taxRate,
    currency: input.currency,
  });
  const stock = evaluateReliability({
    sku: input.sku,
    quantity: input.stock,
    source: input.stockSource,
    lastSupplierUpdate: input.lastSupplierUpdate,
    stockUpdatedAt: input.stockUpdatedAt,
  });
  const customs = productValidator.validateCustomsDecision({
    origin_country: input.originCountry,
    destination_country: input.destinationCountry || input.market,
    category: input.category,
    gtip: input.gtip,
  });

  const missing = [];
  if (!price.ok) missing.push("price");
  if (stock.unreliable) missing.push("stock");
  if (!customs.ok) missing.push("customs");
  if (!input.customerId) missing.push("customer");
  if (!input.sku) missing.push("sku");
  if (price.ok && price.saleApproved !== true) missing.push("precise_price");

  const blockedBySales = !salesEnabled;
  const ok = missing.length === 0;

  return {
    ok,
    draft: true,
    commercial: false,
    commercialCreated: false,
    sent: false,
    salesEnabled,
    salesLocked: blockedBySales,
    missing,
    price,
    stock,
    customs,
    orderId: ok ? `draft_${input.sku}_${input.customerId}` : null,
    note: blockedBySales
      ? "Sales lock closed. Draft only — no commercial order."
      : "Sales flag observed but this path still does not create a commercial order.",
  };
}

const cancelledDrafts = new Map();

function cancelDraft(input = {}) {
  const draftId = String(input.orderId || input.draftId || "").trim();
  if (!draftId) {
    return { ok: false, cancelled: false, reason: "DRAFT_ID_REQUIRED", commercial: false, commercialCreated: false };
  }
  if (cancelledDrafts.has(draftId)) {
    return {
      ok: true,
      cancelled: true,
      duplicate: true,
      draftId,
      commercial: false,
      commercialCreated: false,
      sent: false,
      salesLocked: !isSalesEnabled(),
    };
  }
  cancelledDrafts.set(draftId, { cancelledAt: new Date().toISOString() });
  return {
    ok: true,
    cancelled: true,
    duplicate: false,
    draftId,
    commercial: false,
    commercialCreated: false,
    sent: false,
    salesLocked: !isSalesEnabled(),
  };
}

function resetCancelledDrafts() {
  cancelledDrafts.clear();
}

function createPoDraft(input = {}) {
  const draft = createDraft(input);
  return {
    ...draft,
    purchaseOrder: {
      status: "DRAFT",
      submittedToSupplier: false,
      distinctFromSend: true,
      supplierId: input.supplierId || null,
    },
    realSupplierOrder: false,
    commercialCreated: false,
  };
}

module.exports = {
  createDraft,
  createPoDraft,
  cancelDraft,
  resetCancelledDrafts,
};
