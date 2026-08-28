/** Product validation for catalog/PIM (P1-05). No sales activation. */

const VALID_STATUSES = new Set(["draft", "active", "paused", "archived"]);
const VALID_STOCK_STATUSES = new Set(["in_stock", "low_stock", "out_of_stock", "preorder"]);
const VALID_LOCALES = new Set(["de", "en", "tr", "ar"]);
const EAN_LENGTHS = new Set([8, 12, 13, 14]);

function cleanString(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function validateEan(ean) {
  const digits = String(ean || "").replace(/\D/g, "");
  if (!digits) return { ok: true, value: "", warning: "missing_ean" };
  if (!EAN_LENGTHS.has(digits.length)) {
    return { ok: false, error: "invalid_ean_length", value: digits };
  }
  let sum = 0;
  for (let i = digits.length - 2; i >= 0; i -= 1) {
    const n = Number(digits[i]);
    sum += (digits.length - 1 - i) % 2 === 0 ? n * 3 : n;
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(digits[digits.length - 1])) {
    return { ok: false, error: "invalid_ean_checksum", value: digits };
  }
  return { ok: true, value: digits };
}

function validateMoney(value, fieldName = "price") {
  if (!value || typeof value !== "object") {
    return { ok: false, error: `${fieldName}_required` };
  }
  const amount = Number(value.amount);
  if (Number.isNaN(amount) || amount < 0) {
    return { ok: false, error: `${fieldName}_invalid` };
  }
  if (amount > 999999) {
    return { ok: false, error: `${fieldName}_too_high` };
  }
  return {
    ok: true,
    value: { amount: Math.round(amount * 100) / 100, currency: cleanString(value.currency || "EUR", 3) },
  };
}

function validateI18n(i18n) {
  if (!i18n || typeof i18n !== "object") return { ok: true, value: {} };
  const out = {};
  for (const [locale, entry] of Object.entries(i18n)) {
    if (!VALID_LOCALES.has(locale)) continue;
    if (!entry || typeof entry !== "object") continue;
    out[locale] = {
      name: cleanString(entry.name, 200),
      short_description: cleanString(entry.short_description, 240),
      description: cleanString(entry.description, 8000),
      seo_title: cleanString(entry.seo_title, 120),
      seo_description: cleanString(entry.seo_description, 320),
    };
  }
  return { ok: true, value: out };
}

function validateCustoms(customs) {
  if (!customs || typeof customs !== "object") return { ok: true, value: null };
  const confidence = customs.confidence != null ? Number(customs.confidence) : null;
  return {
    ok: true,
    value: {
      gtip: cleanString(customs.gtip, 20),
      taric: cleanString(customs.taric, 20),
      origin_country: cleanString(customs.origin_country, 2).toUpperCase(),
      duty_rate: customs.duty_rate != null ? Number(customs.duty_rate) : null,
      import_restricted: Boolean(customs.import_restricted),
      source: cleanString(customs.source, 80),
      confidence: confidence != null && !Number.isNaN(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
      review_required: Boolean(customs.review_required) || (confidence != null && confidence < 0.75),
    },
  };
}

function validateVehicleCompatibility(list) {
  if (!Array.isArray(list)) return { ok: true, value: [] };
  const value = list
    .slice(0, 50)
    .map((row) => ({
      brand: cleanString(row.brand, 80),
      model: cleanString(row.model, 80),
      type: cleanString(row.type, 80),
      year_from: row.year_from != null ? Number(row.year_from) : undefined,
      year_to: row.year_to != null ? Number(row.year_to) : undefined,
      engine: cleanString(row.engine, 80),
      part_reference: cleanString(row.part_reference, 80),
    }))
    .filter((row) => row.brand && row.model);
  return { ok: true, value };
}

function validateProduct(input, options = {}) {
  const errors = [];
  const warnings = [];
  const partial = options.partial === true;

  const sku = cleanString(input.sku, 64);
  const name = cleanString(input.name, 200);
  const supplierId = cleanString(input.supplier_id, 64);
  const supplierSku = cleanString(input.supplier_sku, 64);

  if (!partial || input.sku !== undefined) {
    if (!sku) errors.push("sku_required");
  }
  if (!partial || input.name !== undefined) {
    if (!name) errors.push("name_required");
  }
  if (!partial || input.supplier_id !== undefined) {
    if (!supplierId) errors.push("supplier_id_required");
  }
  if (!partial || input.supplier_sku !== undefined) {
    if (!supplierSku) errors.push("supplier_sku_required");
  }

  if (input.status !== undefined && !VALID_STATUSES.has(input.status)) {
    errors.push("invalid_status");
  }
  if (input.stock_status !== undefined && !VALID_STOCK_STATUSES.has(input.stock_status)) {
    errors.push("invalid_stock_status");
  }

  let eanResult = { ok: true, value: "" };
  if (input.ean_gtin !== undefined) {
    eanResult = validateEan(input.ean_gtin);
    if (!eanResult.ok) errors.push(eanResult.error);
    else if (eanResult.warning) warnings.push(eanResult.warning);
  }

  let priceResult = { ok: true, value: null };
  if (input.price !== undefined) {
    priceResult = validateMoney(input.price, "price");
    if (!priceResult.ok) errors.push(priceResult.error);
  }

  let supplierPriceResult = { ok: true, value: null };
  if (input.supplier_price !== undefined) {
    supplierPriceResult = validateMoney(input.supplier_price, "supplier_price");
    if (!supplierPriceResult.ok) errors.push(supplierPriceResult.error);
  }

  const vatRate = input.vat_rate != null ? Number(input.vat_rate) : 19;
  if (Number.isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
    errors.push("invalid_vat_rate");
  }

  const stock = input.stock != null ? Math.max(0, Math.floor(Number(input.stock))) : 0;
  if (input.stock != null && Number.isNaN(Number(input.stock))) {
    errors.push("invalid_stock");
  }

  const i18nResult = validateI18n(input.i18n);
  const customsResult = validateCustoms(input.customs);
  const vehicleResult = validateVehicleCompatibility(input.vehicle_compatibility);

  if (errors.length) {
    return { ok: false, errors, warnings };
  }

  const normalized = {
    ...(input.id ? { id: cleanString(input.id, 64) } : {}),
    sku,
    ean_gtin: eanResult.value,
    brand: cleanString(input.brand, 80),
    manufacturer: cleanString(input.manufacturer || input.brand, 80),
    name,
    short_description: cleanString(input.short_description, 240),
    description: cleanString(input.description, 8000),
    category_id: cleanString(input.category_id, 32),
    category_ids: Array.isArray(input.category_ids) ? input.category_ids.map((c) => cleanString(c, 32)).filter(Boolean) : [],
    images: Array.isArray(input.images) ? input.images.slice(0, 10).map((u) => cleanString(u, 500)) : [],
    documents: Array.isArray(input.documents) ? input.documents : [],
    attributes: input.attributes && typeof input.attributes === "object" ? input.attributes : {},
    variants: Array.isArray(input.variants) ? input.variants : [],
    price: priceResult.value,
    compare_at_price: input.compare_at_price ? validateMoney(input.compare_at_price, "compare_at_price").value : null,
    vat_rate: vatRate,
    stock,
    stock_status: input.stock_status || (stock <= 0 ? "out_of_stock" : "in_stock"),
    supplier_id: supplierId,
    supplier_sku: supplierSku,
    supplier_price: supplierPriceResult.value,
    shipping: input.shipping || { weight_kg: 1, length_cm: 20, width_cm: 20, height_cm: 10, class: "standard" },
    seo: input.seo || { slug: "", title: name, description: cleanString(input.short_description, 320) },
    status: input.status || "draft",
    buy_now_enabled: input.buy_now_enabled ?? false,
    i18n: i18nResult.value,
    vehicle_compatibility: vehicleResult.value,
    customs: customsResult.value,
    ai_source: cleanString(input.ai_source, 80),
    ai_confidence: input.ai_confidence != null ? Number(input.ai_confidence) : null,
  };

  return { ok: true, product: normalized, warnings };
}

module.exports = {
  validateProduct,
  validateEan,
  validateMoney,
  VALID_STATUSES,
  VALID_STOCK_STATUSES,
  VALID_LOCALES,
};
