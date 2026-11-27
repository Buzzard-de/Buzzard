const { STOREFRONTS, LIMITS } = require("./contract");

function httpsImage(url) {
  return typeof url === "string" && url.startsWith("https://");
}

function mapProductItem(product, storeFrontCode) {
  const errors = [];
  const storefront = STOREFRONTS[storeFrontCode];
  const barcode = String(product.barcode || product.ean || product.gtin || "").trim();
  if (!barcode || barcode.length > 40) errors.push("BARCODE_INVALID");
  const title = String(product.title || product.name || "").trim();
  if (!title || title.length > 100) errors.push("TITLE_INVALID");
  const description = String(product.description || "").trim();
  if (!description) errors.push("DESCRIPTION_MISSING");
  const productMainId = String(product.productMainId || product.sku || "").trim();
  if (!productMainId || productMainId.length > 40) errors.push("PRODUCT_MAIN_ID_INVALID");
  if (!Number.isInteger(product.brandId)) errors.push("BRAND_ID_MISSING");
  if (!Number.isInteger(product.categoryId)) errors.push("CATEGORY_ID_MISSING");
  const quantity = Number(product.quantity ?? product.stock);
  if (!Number.isInteger(quantity) || quantity < 0) errors.push("QUANTITY_INVALID");
  const listPrice = Number(product.listPrice);
  const salePrice = Number(product.salePrice);
  if (!Number.isFinite(listPrice) || !Number.isFinite(salePrice) || listPrice < salePrice || salePrice < 0) {
    errors.push("PRICE_INVALID");
  }
  const vatRate = Number(product.vatRate);
  if (!storefront || !storefront.vatRates.includes(vatRate)) errors.push("VAT_RATE_INVALID");
  const images = (product.images || []).map((image) => (typeof image === "string" ? image : image.url)).filter(Boolean);
  if (!images.length || images.length > 8 || images.some((url) => !httpsImage(url))) errors.push("IMAGES_INVALID");
  const attributes = product.attributes || [];
  if (!Array.isArray(attributes) || attributes.length === 0) errors.push("ATTRIBUTES_MISSING");
  if (errors.length) return { ok: false, code: errors[0], errors };

  return {
    ok: true,
    item: {
      barcode,
      title,
      description,
      productMainId,
      brandId: product.brandId,
      categoryId: product.categoryId,
      quantity,
      stockCode: product.sku || product.stockCode || productMainId,
      origin: product.origin || null,
      listPrice,
      salePrice,
      vatRate,
      images: images.map((url) => ({ url })),
      attributes: attributes.map((attribute) => {
        if (attribute.attributeValueId != null) {
          return { attributeId: attribute.attributeId, attributeValueId: attribute.attributeValueId };
        }
        return { attributeId: attribute.attributeId, customAttributeValue: attribute.customAttributeValue };
      }),
    },
  };
}

function mapProductBatch(products, storeFrontCode = "DE") {
  if (!Array.isArray(products) || products.length === 0) return { ok: false, code: "PRODUCTS_MISSING", live: false };
  if (products.length > LIMITS.batchSize) return { ok: false, code: "BATCH_TOO_LARGE", live: false };
  const items = [];
  const failures = [];
  products.forEach((product, index) => {
    const mapped = mapProductItem(product, storeFrontCode);
    if (!mapped.ok) failures.push({ index, sku: product.sku || null, code: mapped.code, errors: mapped.errors });
    else items.push(mapped.item);
  });
  if (failures.length) return { ok: false, code: "PRODUCT_MAPPING_FAILED", failures, live: false };
  return { ok: true, body: { items }, live: false, network: false };
}

module.exports = { mapProductItem, mapProductBatch };
