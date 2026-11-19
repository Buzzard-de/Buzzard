const { validateHubSeoCoverage } = require("../storefront/hubSeoLocaleService");
const { evaluateDevice } = require("../security/deviceStandard");
const supportedLocales = require("../../../lib/i18n/supported-locales.json");
const { htmlDirForLanguage } = require("../i18n/rtlDir");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase15Storefront() {
  const hub = validateHubSeoCoverage();
  const device = evaluateDevice({});
  const rtl = htmlDirForLanguage("ar");
  const locales = Array.isArray(supportedLocales) ? supportedLocales : [];

  const checks = [
    { id: "SF_HUB_SEO", ok: hub.ok === true || hub.hubsValidated >= 48 },
    { id: "SF_DEVICE", ok: device.acceptanceStatus === "CODE_READY" && device.completeClaim === false },
    { id: "SF_LOCALES_30", ok: locales.length >= 30 },
    { id: "SF_RTL", ok: rtl === "rtl" },
    { id: "SF_LIVE_CDN", ok: false, status: "BLOCKED_EXTERNAL", note: "Production CDN cache warm" },
  ];

  return finalizePhase(15, "Mağaza ve UX", checks, ["SF_LIVE_CDN"]);
}

module.exports = { evaluatePhase15Storefront };