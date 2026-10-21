const kit = require("../machineryDomainKit");
const { INVENTORY_TRUST } = require("./constants");
const { evaluateCompatibility } = require("./compatibility");

function inventoryStatus(offer) {
  if (offer.stockQuantity == null) return { trust: INVENTORY_TRUST.UNKNOWN, verifiedStock: false, reason: "no_observation" };
  if (!kit.isFresh(offer.observedAt || offer.provenance?.freshnessAt, 24 * 60 * 60 * 1000)) {
    return { trust: INVENTORY_TRUST.STALE, verifiedStock: false, reason: "stale_observation" };
  }
  return { trust: INVENTORY_TRUST.SUPPLIER_REPORTED, verifiedStock: false, reason: "supplier_reported_only", quantity: offer.stockQuantity };
}

function rankOffers(store, query = {}) {
  const compatibility = query.skipCompatibility ? null : evaluateCompatibility(store, query);
  const items = [...store.offers.values()]
    .filter((offer) => !query.partId || offer.partId === query.partId)
    .map((offer) => {
      const supplier = store.suppliers.get(offer.supplierId) || {};
      const warehouse = store.warehouses.get(offer.warehouseId) || { location: null };
      const inventory = inventoryStatus(offer);
      const priced = kit.pricingContract.previewSalePrice({
        supplierPrice: offer.supplierPrice,
        currency: offer.currency || "EUR",
      });
      const shipping = Number(offer.shippingCost || 0);
      let score = 0;
      if (compatibility?.state === "VERIFIED_COMPATIBLE") score += 100;
      else if (compatibility?.state === "VERIFIED_INCOMPATIBLE") score -= 200;
      if (inventory.trust === INVENTORY_TRUST.STALE) score -= 40;
      const factors = {
        compatibilityState: compatibility?.state || "NOT_EVALUATED",
        inventoryTrust: inventory.trust,
        verifiedStock: false,
        warehouseLocation: warehouse.location || null,
        deliveryEstimate: offer.leadTimeDays ?? null,
        deliveryEstimatePresent: offer.leadTimeDays != null,
        supplierHeadquartersCountry: supplier.headquartersCountry || supplier.country || null,
        salePreview: priced,
        minNetProfitEur: priced.minNetProfitEur,
        landedCost: Number(offer.supplierPrice || 0) + shipping,
        inferredWarehouseFromHq: false,
        purchaseExecuted: false,
        marketUndercutApplied: false,
      };
      return {
        offerId: offer.id,
        partId: offer.partId,
        supplier: { id: offer.supplierId, headquartersCountry: factors.supplierHeadquartersCountry },
        warehouse: { id: offer.warehouseId, location: warehouse.location, inferredFromSupplierCountry: false },
        inventory,
        factors,
        score,
      };
    })
    .sort((a, b) => {
      const rank = { VERIFIED_COMPATIBLE: 0, CONDITIONALLY_COMPATIBLE: 1, POSSIBLE_ALTERNATIVE: 2, INSUFFICIENT_DATA: 3, VERIFIED_INCOMPATIBLE: 4 };
      return (rank[a.factors.compatibilityState] ?? 5) - (rank[b.factors.compatibilityState] ?? 5) || b.score - a.score;
    });
  return {
    items,
    compatibility,
    pricingEngine: "server/lib/pricing.js via machineryDomainKit/pricingContract",
    purchaseExecuted: false,
  };
}

module.exports = { inventoryStatus, rankOffers };
