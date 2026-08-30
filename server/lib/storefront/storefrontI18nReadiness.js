/**
 * Part 18 — Multilingual readiness (architecture check — no invented translations).
 */
const fs = require("fs");
const path = require("path");

const REQUIRED_LOCALES = ["de", "en", "ar"];
const OPTIONAL_LOCALES = ["fr", "tr"];
const PROJECT_ROOT = path.resolve(__dirname, "../../../");

function localeFileExists(locale) {
  const p = path.join(PROJECT_ROOT, "lib", "i18n", "locales", `${locale}.ts`);
  return fs.existsSync(p);
}

function getI18nReadiness() {
  const configured = ["de", "en", "tr", "ar"].filter(localeFileExists);
  const requiredPresent = REQUIRED_LOCALES.every((l) => configured.includes(l));
  const frPresent = localeFileExists("fr");

  return {
    configuredLocales: configured,
    requiredLocales: REQUIRED_LOCALES,
    optionalLocales: OPTIONAL_LOCALES,
    frConfigured: frPresent,
    trConfigured: configured.includes("tr"),
    rtlSupport: configured.includes("ar"),
    rtlStylesheet: fs.existsSync(path.join(PROJECT_ROOT, "styles", "rtl.css")),
    translationArchitecture: "lib/i18n/locales/*.ts + lib/i18n/translations.ts",
    autoInventTranslations: false,
    requiredPresent,
    note: frPresent
      ? "FR locale file present"
      : "FR not configured — TR available instead; do not invent FR translations",
  };
}

module.exports = {
  REQUIRED_LOCALES,
  getI18nReadiness,
};
