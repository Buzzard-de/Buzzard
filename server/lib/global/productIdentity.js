/**
 * Stable product identity — translations never become primary identity.
 */
const IDENTITY_PRIORITY = Object.freeze([
  "productId",
  "gtin",
  "ean",
  "brandMpn",
  "supplierSku",
]);

function normalizeIdentifier(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function buildBrandMpnKey(brand, mpn) {
  const b = normalizeIdentifier(brand);
  const m = normalizeIdentifier(mpn);
  if (!b || !m) return null;
  return `${b.toUpperCase()}::${m.toUpperCase()}`;
}

function extractProductIdentity(product = {}) {
  return {
    productId: normalizeIdentifier(product.productId || product.id),
    sku: normalizeIdentifier(product.sku),
    supplierSku: normalizeIdentifier(product.supplierSku || product.sourceProductId),
    supplierId: normalizeIdentifier(product.supplierId || product.supplierCode || product.supplier),
    gtin: normalizeIdentifier(product.gtin),
    ean: normalizeIdentifier(product.ean),
    mpn: normalizeIdentifier(product.mpn),
    brand: normalizeIdentifier(product.brand),
    manufacturer: normalizeIdentifier(product.manufacturer),
    model: normalizeIdentifier(product.model),
    brandMpn: buildBrandMpnKey(product.brand, product.mpn),
  };
}

function compareIdentity(a, b) {
  const idA = extractProductIdentity(a);
  const idB = extractProductIdentity(b);

  if (idA.productId && idB.productId && idA.productId === idB.productId) {
    return { match: true, method: "productId", priority: 1 };
  }
  if (idA.gtin && idB.gtin && idA.gtin === idB.gtin) {
    return { match: true, method: "gtin", priority: 2 };
  }
  if (idA.ean && idB.ean && idA.ean === idB.ean) {
    return { match: true, method: "ean", priority: 3 };
  }
  if (idA.brandMpn && idB.brandMpn && idA.brandMpn === idB.brandMpn) {
    return { match: true, method: "brandMpn", priority: 4 };
  }
  if (
    idA.supplierSku &&
    idB.supplierSku &&
    idA.supplierId &&
    idB.supplierId &&
    idA.supplierSku === idB.supplierSku &&
    idA.supplierId === idB.supplierId
  ) {
    return { match: true, method: "supplierSku", priority: 5 };
  }

  return { match: false, method: null, priority: null };
}

function identityFingerprint(product = {}) {
  const id = extractProductIdentity(product);
  return IDENTITY_PRIORITY.map((key) => id[key === "brandMpn" ? "brandMpn" : key] || "").join("|");
}

module.exports = {
  IDENTITY_PRIORITY,
  extractProductIdentity,
  compareIdentity,
  identityFingerprint,
  buildBrandMpnKey,
};
