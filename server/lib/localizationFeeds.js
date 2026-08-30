const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_LOCALIZATION_FEEDS !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listLocales() {
  return db.prepare("SELECT * FROM locales WHERE active = 1 ORDER BY code").all();
}

function getCountryConfig(countryCode) {
  const country = String(countryCode || "").toUpperCase();
  const locale = db.prepare("SELECT * FROM locales WHERE country_code = ? LIMIT 1").get(country);
  const tax = db.prepare("SELECT rate FROM tax_rates WHERE country_code = ?").get(country);
  const shipping = db
    .prepare("SELECT * FROM shipping_rates WHERE country_code = ? ORDER BY price")
    .all(country);
  return {
    country,
    locale: locale || null,
    taxRate: tax?.rate ?? null,
    shipping,
  };
}

function resolveLocaleCurrency(localeCode) {
  return db.prepare("SELECT currency FROM locales WHERE code = ?").get(localeCode)?.currency || "EUR";
}

function applyPriceOverride(product, localeCode) {
  const override = db
    .prepare("SELECT price, currency FROM price_overrides WHERE product_id = ? AND locale = ?")
    .get(product.id, localeCode);
  if (!override) {
    return {
      ...product,
      price: Number(product.price_eur ?? product.price ?? 0),
      currency: resolveLocaleCurrency(localeCode),
    };
  }
  return {
    ...product,
    price: Number(override.price),
    currency: override.currency,
  };
}

function listLocalizedCatalog(filters = {}) {
  const locale = filters.locale || "de-DE";
  const country = (filters.country || "DE").toUpperCase();
  const currency = filters.currency || resolveLocaleCurrency(locale);

  let sql = `
    SELECT p.id, p.sku, p.price_eur, p.stock, p.image_url, p.active,
      COALESCE(pt.name, p.name) name,
      COALESCE(pt.description, p.description) description,
      COALESCE(pt.slug, p.slug) slug,
      COALESCE(pt.seo_title, p.seo_title, p.name) seo_title,
      COALESCE(pt.seo_description, p.seo_description, p.description) seo_description,
      c.name category, c.slug category_slug
    FROM products p
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.active = 1
  `;
  const args = [locale];

  if (filters.q) {
    sql += " AND (COALESCE(pt.name, p.name) LIKE ? OR p.sku LIKE ?)";
    args.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.category) {
    sql += " AND c.slug = ?";
    args.push(filters.category);
  }
  if (filters.minPrice != null && filters.minPrice !== "") {
    sql += " AND p.price_eur >= ?";
    args.push(Number(filters.minPrice));
  }
  if (filters.maxPrice != null && filters.maxPrice !== "") {
    sql += " AND p.price_eur <= ?";
    args.push(Number(filters.maxPrice));
  }
  if (filters.vehicleId) {
    sql += `
      AND EXISTS (
        SELECT 1 FROM compatibility comp
        WHERE comp.product_sku = p.sku AND comp.vehicle_id = ?
      )
    `;
    args.push(Number(filters.vehicleId));
  }

  sql += " ORDER BY p.updated_at DESC, p.id DESC";
  const rows = db.prepare(sql).all(...args);
  return rows.map((row) => ({
    ...applyPriceOverride(row, locale),
    country,
    locale,
    currency,
    active: Boolean(row.active),
  }));
}

function getLocalizedProductBySlug(slug, localeCode = "de-DE") {
  const product = db
    .prepare(`
      SELECT p.*,
        COALESCE(pt.name, p.name) name,
        COALESCE(pt.description, p.description) description,
        COALESCE(pt.slug, p.slug) slug,
        COALESCE(pt.seo_title, p.seo_title, p.name) seo_title,
        COALESCE(pt.seo_description, p.seo_description, p.description) seo_description,
        c.name category, c.slug category_slug
      FROM products p
      LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE COALESCE(pt.slug, p.slug) = ? AND p.active = 1
    `)
    .get(localeCode, slug);

  if (!product) return null;

  const images = db
    .prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id")
    .all(product.id);

  return {
    ...applyPriceOverride(product, localeCode),
    locale: localeCode,
    images,
    active: Boolean(product.active),
  };
}

function buildGoogleMerchantFeed(filters = {}) {
  if (process.env.BUZZARD_MERCHANT_FEED_LEGACY !== "1") {
    const merchantFeedService = require("./storefront/merchantFeedService");
    return merchantFeedService.buildGoogleMerchantFeedXml(filters);
  }

  const locale = filters.locale || "de-DE";
  const currency = filters.currency || resolveLocaleCurrency(locale);
  const country = (filters.country || "DE").toUpperCase();
  const base = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(
    /\/$/,
    ""
  );

  const products = db
    .prepare(`
      SELECT p.*,
        COALESCE(pt.name, p.name) name,
        COALESCE(pt.description, p.description) description,
        COALESCE(pt.slug, p.slug) slug
      FROM products p
      LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
      WHERE p.active = 1
    `)
    .all(locale);

  const items = products
    .map((product) => {
      const priced = applyPriceOverride(product, locale);
      const availability = product.stock > 0 ? "in_stock" : "out_of_stock";
      return `<item><g:id>${escapeXml(product.sku)}</g:id><g:title>${escapeXml(priced.name)}</g:title><g:description>${escapeXml(priced.description)}</g:description><g:link>${base}/produkt/${escapeXml(priced.slug)}/?lang=${escapeXml(locale)}</g:link><g:availability>${availability}</g:availability><g:price>${Number(priced.price).toFixed(2)} ${currency}</g:price><g:condition>new</g:condition><g:shipping><g:country>${country}</g:country></g:shipping></item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Buzzard</title>${items}</channel></rss>`;
}

function getAdminLocalizationStatus() {
  return {
    version: "0.9.0",
    enabled: isEnabled(),
    locales: db.prepare("SELECT * FROM locales ORDER BY code").all(),
    totals: {
      translations: db.prepare("SELECT COUNT(*) n FROM product_translations").get().n,
      priceOverrides: db.prepare("SELECT COUNT(*) n FROM price_overrides").get().n,
      shippingRates: db.prepare("SELECT COUNT(*) n FROM shipping_rates").get().n,
    },
    taxRates: db.prepare("SELECT * FROM tax_rates ORDER BY country_code").all(),
  };
}

function upsertProductTranslation(productId, body = {}) {
  const { locale, name, description = "", seoTitle, seoDescription, slug } = body;
  if (!locale || !name) return { error: "locale and name required", status: 400 };
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) return { error: "Product not found", status: 404 };

  db.prepare(`
    INSERT INTO product_translations(product_id, locale, name, description, seo_title, seo_description, slug)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(product_id, locale) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      slug = excluded.slug
  `).run(
    productId,
    locale,
    name,
    description,
    seoTitle || name,
    seoDescription || description || name,
    slug || slugify(name)
  );

  return { ok: true };
}

function upsertPriceOverride(productId, body = {}) {
  const { locale, price, currency } = body;
  if (!locale || price === undefined) return { error: "locale and price required", status: 400 };
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) return { error: "Product not found", status: 404 };

  const resolvedCurrency =
    currency || db.prepare("SELECT currency FROM locales WHERE code = ?").get(locale)?.currency || "EUR";

  db.prepare(`
    INSERT INTO price_overrides(product_id, locale, currency, price)
    VALUES(?,?,?,?)
    ON CONFLICT(product_id, locale) DO UPDATE SET currency = excluded.currency, price = excluded.price
  `).run(productId, locale, resolvedCurrency, Number(price));

  return { ok: true, currency: resolvedCurrency, price: Number(price) };
}

function upsertShippingRate(body = {}) {
  const { countryCode, method = "standard", price, freeFrom = 0 } = body;
  if (!countryCode || price === undefined) {
    return { error: "countryCode and price required", status: 400 };
  }

  db.prepare(`
    INSERT INTO shipping_rates(country_code, method, price, free_from)
    VALUES(?,?,?,?)
    ON CONFLICT(country_code, method) DO UPDATE SET price = excluded.price, free_from = excluded.free_from
  `).run(String(countryCode).toUpperCase(), method, Number(price), Number(freeFrom));

  return { ok: true };
}

function getLocalizationFeedsStatus() {
  return {
    version: "0.9.0",
    enabled: isEnabled(),
    localeCount: db.prepare("SELECT COUNT(*) n FROM locales WHERE active = 1").get().n,
    totals: {
      translations: db.prepare("SELECT COUNT(*) n FROM product_translations").get().n,
      priceOverrides: db.prepare("SELECT COUNT(*) n FROM price_overrides").get().n,
      taxRates: db.prepare("SELECT COUNT(*) n FROM tax_rates").get().n,
      shippingRates: db.prepare("SELECT COUNT(*) n FROM shipping_rates").get().n,
    },
  };
}

module.exports = {
  isEnabled,
  listLocales,
  getCountryConfig,
  listLocalizedCatalog,
  getLocalizedProductBySlug,
  buildGoogleMerchantFeed,
  getAdminLocalizationStatus,
  upsertProductTranslation,
  upsertPriceOverride,
  upsertShippingRate,
  getLocalizationFeedsStatus,
  slugify,
};
