const pricing = require("../pricing");
const { INVENTORY_TRUST, DEFAULT_STALE_INVENTORY_MS } = require("./constants");
const { isFresh } = require("./provenance");
const { evaluateCompatibility } = require("./compatibility");

function inventoryStatus(offer, now = Date.now(), staleMs = DEFAULT_STALE_INVENTORY_MS) {
  if (offer.stockQuantity == null && offer.stockStatus == null) {
    return { trust: INVENTORY_TRUST.UNKNOWN, verifiedStock: false, reason: "no_observation" };
  }
  if (!isFresh(offer.observedAt || offer.provenance?.freshnessAt, staleMs)) {
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
  const compatibility = query.skipCompatibility
    ? null
    : evaluateCompatibility(store, { ...query, partId });

  const rows = offers.map((offer) => {
    const supplier = store.suppliers.get(offer.supplierId) || {
      id: offer.supplierId,
      country: offer.supplierCountry || null,
      headquartersCountry: offer.supplierCountry || null,
    };
    const warehouse = store.warehouses.get(offer.warehouseId) || {
      id: offer.warehouseId,
      location: offer.warehouseLocation || null,
    };
    const inventory = inventoryStatus(offer);
    const priced = pricing.calculateSalePrice({
      supplierPrice: offer.supplierPrice,
      markupPercent: query.markupPercent ?? 38,
      minimumMarginPercent: query.minimumMarginPercent ?? 12,
      currency: offer.currency || "EUR",
    });
    const marginOk = pricing.meetsMinimumMargin({
      salePrice: priced.amount,
      purchasePrice: offer.supplierPrice,
      minimumMarginPercent: query.minimumMarginPercent ?? 12,
    });
    const shipping = Number(offer.shippingCost || 0);
    const landed = Number(offer.supplierPrice || 0) + shipping;
    const factors = {
      compatibilityState: compatibility?.state || "NOT_EVALUATED",
      inventoryTrust: inventory.trust,
      verifiedStock: inventory.verifiedStock,
      acquisitionCost: offer.supplierPrice ?? null,
      shippingCost: shipping,
      landedCost: landed,
      leadTimeDays: offer.leadTimeDays ?? null,
      salePreview: priced,
      minimumMarginMet: marginOk,
      supplierCountry: supplier.headquartersCountry || supplier.country || null,
      warehouseLocation: warehouse.location || null,
      warehouseDistinctFromHq: Boolean(
        warehouse.location?.country &&
          supplier.headquartersCountry &&
          warehouse.location.country !== supplier.headquartersCountry
      ),
      mock: Boolean(offer.provenance?.mock),
      marketUndercutApplied: false,
    };

    let score = 0;
    if (compatibility?.state === "VERIFIED_COMPATIBLE") score += 100;
    else if (compatibility?.state === "CONDITIONALLY_COMPATIBLE") score += 40;
    else if (compatibility?.state === "POSSIBLE_ALTERNATIVE") score += 5;
    else if (compatibility?.state === "VERIFIED_INCOMPATIBLE") score -= 200;
    if (inventory.trust === INVENTORY_TRUST.SUPPLIER_REPORTED) score += 20;
    if (inventory.trust === INVENTORY_TRUST.STALE) score -= 40;
    if (inventory.trust === INVENTORY_TRUST.UNKNOWN) score -= 20;
    if (marginOk) score += 15;
    else score -= 50;
    if (Number.isFinite(landed) && landed > 0) score += Math.max(0, 40 - landed / 10);

    return {
      offerId: offer.id,
      partId: offer.partId,
      supplier: {
        id: supplier.id,
        country: supplier.country || null,
        headquartersCountry: supplier.headquartersCountry || supplier.country || null,
      },
      warehouse: {
        id: warehouse.id,
        location: warehouse.location || null,
        inferredFromSupplierCountry: false,
      },
      inventory,
      factors,
      score,
    };
  });

  rows.sort((a, b) => b.score - a.score);
  return {
    items: rows,
    compatibility,
    pricingEngine: "server/lib/pricing.js",
    purchaseExecuted: false,
    note: "Lower price does not win automatically. Stock is supplier-reported, never independently verified.",
  };
}

module.exports = {
  inventoryStatus,
  rankOffers,
};
