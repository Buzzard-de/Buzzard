/**
 * Product translation validation — missing translations → REVIEW_REQUIRED.
 */
const { getLanguage } = require("../../core/globalLanguageRegistry");
const { generateLocalizedSlug } = require("./slugGeneration");

const MANDATORY_LANGUAGES = Object.freeze(["de", "en"]);

function validateTranslationEntry(languageCode, entry = {}) {
  const errors = [];
  const warnings = [];
  const lang = getLanguage(languageCode);

  if (!lang) {
    errors.push({ code: "INVALID_LANGUAGE_CODE", field: "language", language: languageCode });
    return { valid: false, errors, warnings };
  }

  const title = String(entry.title || "").trim();
  const description = String(entry.description || "").trim();
  const slug = String(entry.slug || entry.seo?.slug || "").trim();
  const metaTitle = String(entry.seo?.metaTitle || entry.metaTitle || "").trim();
  const metaDescription = String(entry.seo?.metaDescription || entry.metaDescription || "").trim();

  if (!title) errors.push({ code: "MISSING_TITLE", field: "title", language: languageCode });
  if (!description) warnings.push({ code: "MISSING_DESCRIPTION", field: "description", language: languageCode });
  if (slug && slug !== generateLocalizedSlug(slug, { language: languageCode })) {
    errors.push({ code: "INVALID_LOCALIZED_SLUG", field: "slug", language: languageCode });
  }
  if (!metaTitle) warnings.push({ code: "MISSING_SEO_TITLE", field: "seo.metaTitle", language: languageCode });
  if (!metaDescription) warnings.push({ code: "MISSING_SEO_DESCRIPTION", field: "seo.metaDescription", language: languageCode });

  if (lang.direction === "rtl" && title && !/[\u0600-\u06FF]/.test(title) && languageCode === "ar") {
    warnings.push({ code: "RTL_TITLE_NOT_ARABIC_SCRIPT", field: "title", language: languageCode });
  }

  return { valid: errors.length === 0, errors, warnings, language: languageCode };
}

function validateProductTranslations(product = {}, options = {}) {
  const mandatory = options.mandatoryLanguages || MANDATORY_LANGUAGES;
  const translations = product.translations || {};
  const errors = [];
  const warnings = [];
  const missingLanguages = [];

  for (const lang of mandatory) {
    if (!translations[lang]) {
      missingLanguages.push(lang);
      errors.push({ code: "MISSING_TRANSLATION", field: "translations", language: lang });
      continue;
    }
    const result = validateTranslationEntry(lang, translations[lang]);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  for (const [lang, entry] of Object.entries(translations)) {
    if (mandatory.includes(lang)) continue;
    const result = validateTranslationEntry(lang, entry);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const slugSet = new Set();
  for (const [lang, entry] of Object.entries(translations)) {
    const slug = String(entry.slug || entry.seo?.slug || "").trim();
    if (!slug) continue;
    const key = `${lang}:${slug}`;
    if (slugSet.has(slug)) {
      errors.push({ code: "DUPLICATE_SLUG", field: "slug", language: lang, slug });
    }
    slugSet.add(slug);
    slugSet.add(key);
  }

  const valid = errors.length === 0;
  return {
    valid,
    status: valid ? (warnings.length ? "REVIEW_REQUIRED" : "VALID") : "REVIEW_REQUIRED",
    errors,
    warnings,
    missingLanguages,
  };
}

module.exports = {
  MANDATORY_LANGUAGES,
  validateTranslationEntry,
  validateProductTranslations,
};
