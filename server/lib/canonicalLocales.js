/**
 * Server view of the canonical UI locale registry.
 * Source: lib/i18n/supported-locales.json (same file as lib/i18n/types.ts).
 */
const SUPPORTED_LOCALES = require("../../lib/i18n/supported-locales.json");

function normalizeLocale(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .replace("_", "-")
    .split("-")[0];
}

function isSupportedLocale(code) {
  return SUPPORTED_LOCALES.includes(normalizeLocale(code));
}

/** Accept UI locales; unknown codes fall back to English, never a silent 4-locale clamp. */
function resolveSupportedLocale(code, fallback = "en") {
  const normalized = normalizeLocale(code);
  if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  if (SUPPORTED_LOCALES.includes(fallback)) return fallback;
  return "en";
}

module.exports = {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeLocale,
  resolveSupportedLocale,
};
