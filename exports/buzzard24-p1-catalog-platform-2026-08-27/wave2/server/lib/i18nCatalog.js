/** Product i18n gap detection (P1-13). Uses existing translation files — no rebuild. */

const fs = require("fs");
const path = require("path");
const productStore = require("./productStore");

const LOCALES = ["de", "en", "tr", "ar"];
const translationsFile = path.join(__dirname, "..", "..", "data", "buzzard_product_translations.json");

function readTranslations() {
  try {
    return JSON.parse(fs.readFileSync(translationsFile, "utf8"));
  } catch {
    return {};
  }
}

function detectProductI18nGaps(options = {}) {
  const products = productStore.listProducts(options.status ? { status: options.status } : {});
  const translations = readTranslations();
  const gaps = [];

  for (const product of products) {
    const row = translations[product.id] || translations[product.seo?.slug] || {};
    const missingLocales = [];
    const partialLocales = [];

    for (const locale of LOCALES) {
      if (locale === "de") {
        if (!product.name) missingLocales.push(locale);
        continue;
      }
      const entry = row[locale];
      if (!entry) {
        missingLocales.push(locale);
      } else if (!entry.name || !entry.short_description) {
        partialLocales.push(locale);
      }
    }

    if (missingLocales.length || partialLocales.length) {
      gaps.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        missing_locales: missingLocales,
        partial_locales: partialLocales,
      });
    }
  }

  return {
    locales: LOCALES,
    product_count: products.length,
    products_with_gaps: gaps.length,
    coverage_percent: products.length
      ? Math.round(((products.length - gaps.length) / products.length) * 100)
      : 100,
    gaps: gaps.slice(0, Number(options.limit) || 100),
    storefront: {
      language_selector: "components/LanguageSelector.tsx",
      browser_detection: "lib/i18n/detect.ts",
      rtl_locales: ["ar"],
      routing: "lib/i18n/routing.ts",
    },
    generated_at: new Date().toISOString(),
  };
}

module.exports = { detectProductI18nGaps, LOCALES };
