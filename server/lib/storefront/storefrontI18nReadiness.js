/**
 * Part 18 — Multilingual readiness (architecture check — no invented translations).
 */
const fs = require("fs");
const path = require("path");

const { SUPPORTED_LOCALES } = require("../canonicalLocales");

const REQUIRED_LOCALES = [...SUPPORTED_LOCALES];
const OPTIONAL_LOCALES = [];
const PROJECT_ROOT = path.resolve(__dirname, "../../../");

function localeFileExists(locale) {
  const p = path.join(PROJECT_ROOT, "lib", "i18n", "locales", `${locale}.ts`);
  return fs.existsSync(p);
}

function getI18nReadiness() {
  const configured = REQUIRED_LOCALES.filter(localeFileExists);
  const requiredPresent = REQUIRED_LOCALES.every((l) => configured.includes(l));

  return {
    configuredLocales: configured,
    requiredLocales: REQUIRED_LOCALES,
    optionalLocales: OPTIONAL_LOCALES,
    frConfigured: configured.includes("fr"),
    trConfigured: configured.includes("tr"),
    rtlSupport: configured.includes("ar"),
    rtlStylesheet: fs.existsSync(path.join(PROJECT_ROOT, "styles", "rtl.css")),
    translationArchitecture: "lib/i18n/locales/*.ts + lib/i18n/translations.ts",
    autoInventTranslations: false,
    requiredPresent,
    localeCount: configured.length,
    note: `${configured.length}/${REQUIRED_LOCALES.length} canonical locales have catalog files`,
  };
}

module.exports = {
  REQUIRED_LOCALES,
  getI18nReadiness,
};
