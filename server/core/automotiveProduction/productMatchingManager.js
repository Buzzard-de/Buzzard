/**
 * Automotive Production Integration — multi-supplier product matching.
 */
const automotiveCore = require("../automotiveCore");
const { PRODUCTION_CONFIG } = require("./productionConfig");

const MATCH_PRIORITY = Object.freeze(["gtin", "ean", "brand_mpn", "oem", "supplier_sku"]);

function matchKey(product = {}, type) {
  switch (type) {
    case "gtin":
      return product.gtin || product.identifiers?.gtin || null;
    case "ean":
      return product.ean || product.identifiers?.ean || null;
    case "brand_mpn": {
      const brand = (product.brand || product.manufacturer || "").toLowerCase();
      const mpn = (product.mpn || product.identifiers?.mpn || "").toLowerCase();
      return brand && mpn ? `${brand}|${mpn}` : null;
    }
    case "oem":
      return product.oem || product.identifiers?.oem || null;
    case "supplier_sku":
      return product.supplierId && product.supplierSku
        ? `${product.supplierId}|${product.supplierSku}`
        : null;
    default:
      return null;
  }
}

function findMatchingCanonical(product = {}, catalog = []) {
  for (const priority of MATCH_PRIORITY) {
    const key = matchKey(product, priority);
    if (!key) continue;
    const match = catalog.find((other) => matchKey(other, priority) === key);
    if (match) return { matched: true, priority, canonicalProductId: match.sku || match.id, product: match };
  }
  return { matched: false, priority: null, canonicalProductId: null };
}

function buildSupplierOffers(canonicalProductId, offers = []) {
  return {
    canonicalProductId,
    offers: offers.map((o) => ({
      supplierId: o.supplierId,
      supplierSku: o.supplierSku,
      purchasePrice: o.purchasePrice ?? o.price ?? null,
      stock: o.stock ?? o.availableStock ?? null,
      deliveryTime: o.deliveryTime || null,
      currency: o.currency || "EUR",
      country: o.country || "DE",
    })),
  };
}

function scoreSupplierOffer(offer = {}, weights = PRODUCTION_CONFIG.supplierScoreWeights()) {
  const priceScore = offer.purchasePrice != null ? Math.max(0, 1 - offer.purchasePrice / 1000) : 0.5;
  const stockScore = offer.stock > 0 ? 1 : offer.stock === 0 ? 0 : 0.3;
  const deliveryScore = offer.deliveryTime != null ? Math.max(0, 1 - offer.deliveryTime / 14) : 0.5;
  const reliabilityScore = offer.reliability ?? 0.7;
  const shippingScore = offer.shippingScore ?? 0.8;

  const score =
    priceScore * weights.price +
    stockScore * weights.stock +
    deliveryScore * weights.delivery +
    reliabilityScore * weights.reliability +
    shippingScore * weights.shipping;

  return {
    supplierId: offer.supplierId,
    score: Math.round(score * 1000) / 1000,
    autoSelectionAllowed: PRODUCTION_CONFIG.autoOrderEnabled(),
    recommended: score >= 0.7,
  };
}

function recommendSupplier(offers = []) {
  const scored = offers.map((o) => scoreSupplierOffer(o));
  scored.sort((a, b) => b.score - a.score);
  return {
    recommendation: scored[0] || null,
    candidates: scored,
    manualSelectionRequired: !PRODUCTION_CONFIG.autoOrderEnabled(),
  };
}

function runAiSupplierMatch(input = {}) {
  const ai = automotiveCore.matchProduct(input);
  return {
    ...ai,
    canAutoSelect: false,
    requiresHumanReview: true,
  };
}

module.exports = {
  MATCH_PRIORITY,
  findMatchingCanonical,
  buildSupplierOffers,
  scoreSupplierOffer,
  recommendSupplier,
  runAiSupplierMatch,
};
