const kit = require("../machineryDomainKit");
const { INVENTORY_TRUST } = require("./constants");
const { evaluateCompatibility } = require("./compatibility");

const STALE_MS = 24 * 60 * 60 * 1000;

function inventoryStatus(offer) {
  if (offer.stockQuantity == null && offer.stockStatus == null) {
    return { trust: INVENTORY_TRUST.UNKNOWN, verifiedStock: false, reason: "no_observation" };
  }
  if (!kit.isFresh(offer.observedAt || offer.provenance?.freshnessAt, STALE_MS)) {
    return { trust: INVENTORY_TRUST.STALE, verifiedStock: false, reason: "stale_observation" };
  }
  return {
    trust: INVENTORY_TRUST.SUPPLIER_REPORTED,
    verifiedStock: false,
    reason: "supplier_reported_only",
    quantity: offer.stockQuantity ?? null,
  };
}

function rankOffers(store, query = {}) {
  const partId = query.partId;
  const offers = [...store.offers.values()].filter((offer) => !partId || offer.partId === partId);
  const compatibility = query.skipCompatibility ? null : evaluateCompatibility(store, query);
  const rows = offers.map((offer) => {
    const supplier = store.suppliers.get(offer.supplierId) || { id: offer.supplierId, headquartersCountry: offer.supplierCountry };
    const warehouse = store.warehouses.get(offer.warehouseId) || { id: offer.warehouseId, location: offer.warehouseLocation || null };
    const inventory = inventoryStatus(offer);
    const priced = kit.pricingContract.previewSalePrice({
      supplierPrice: offer.supplierPrice,
      markupPercent: query.markupPercent ?? 38,
      minimumMarginPercent: query.minimumMarginPercent ?? 12,
      currency: offer.currency || "EUR",
    });
    const shipping = Number(offer.shippingCost || 0);
    const factors = {
      compatibilityState: compatibility?.state || "NOT_EVALUATED",
      inventoryTrust: inventory.trust,
      verifiedStock: inventory.verifiedStock,
      acquisitionCost: offer.supplierPrice ?? null,
      shippingCost: shipping,
      landedCost: Number(offer.supplierPrice || 0) + shipping,
      leadTimeDays: offer.leadTimeDays ?? null,
      salePreview: priced,
      minNetProfitEur: priced.minNetProfitEur,
      supplierHeadquartersCountry: supplier.headquartersCountry || supplier.country || null,
      warehouseLocation: warehouse.location || null,
      warehouseDistinctFromHq: Boolean(
        warehouse.location?.country && supplier.headquartersCountry && warehouse.location.country !== supplier.headquartersCountry
      ),
      inferredWarehouseFromHq: false,
      marketUndercutApplied: false,
      purchaseExecuted: false,
    };
    let score = 0;
    if (compatibility?.state === "VERIFIED_COMPATIBLE") score += 100;
    else if (compatibility?.state === "CONDITIONALLY_COMPATIBLE") score += 40;
    else if (compatibility?.state === "POSSIBLE_ALTERNATIVE") score += 5;
    else if (compatibility?.state === "VERIFIED_INCOMPATIBLE") score -= 200;
    if (inventory.trust === INVENTORY_TRUST.SUPPLIER_REPORTED) score += 20;
    if (inventory.trust === INVENTORY_TRUST.STALE) score -= 40;
    if (priced.marginOk) score += 15;
    score += Math.max(0, 30 - factors.landedCost / 10);
    return {
      offerId: offer.id,
      partId: offer.partId,
      supplier: { id: supplier.id, headquartersCountry: factors.supplierHeadquartersCountry },
      warehouse: { id: warehouse.id, location: warehouse.location, inferredFromSupplierCountry: false },
      inventory,
      factors,
      score,
    };
  });
  rows.sort((a, b) => {
    const rank = { VERIFIED_COMPATIBLE: 0, CONDITIONALLY_COMPATIBLE: 1, POSSIBLE_ALTERNATIVE: 2, INSUFFICIENT_DATA: 3, VERIFIED_INCOMPATIBLE: 4 };
    return (rank[a.factors.compatibilityState] ?? 5) - (rank[b.factors.compatibilityState] ?? 5) || b.score - a.score;
  });
  return {
    items: rows,
    compatibility,
    pricingEngine: "server/lib/pricing.js via machineryDomainKit/pricingContract",
    purchaseExecuted: false,
    note: "Price never outranks verified incompatibility. Stock is supplier-reported only.",
  };
}

module.exports = { inventoryStatus, rankOffers };
