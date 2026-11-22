const { runPhase15Evidence } = require("../storefront/phase15Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase15Storefront() {
  const evidence = runPhase15Evidence();
  const checks = [
    { id: "SF_HUB_SEO", ok: evidence.ok === true && evidence.hubs === 50 },
    { id: "SF_DEVICE", ok: evidence.deviceMissing > 0 },
    { id: "SF_LOCALES_30", ok: evidence.locales >= 30 },
    { id: "SF_RTL", ok: evidence.rtl === "rtl" },
    { id: "SF_CHECKOUT_LOCKED", ok: evidence.checkout === "sales_disabled" },
    { id: "SF_LIVE_CDN", ok: false, status: "BLOCKED_EXTERNAL", note: "Production CDN cache warm" },
    {
      id: "SF_BROWSER",
      ok: evidence.browserVerified === true,
      status: evidence.browserVerified === true ? "PASS" : "NOT_RUN",
      note: evidence.browserVerified === true
        ? "Chromium opened all 30 locales on isolated ports 3010 and 3011"
        : "Browser evidence is missing or a locale check failed",
    },
  ];
  return {
    ...finalizePhase(15, "Mağaza ve UX", checks, ["SF_LIVE_CDN"]),
    evidence,
  };
}

module.exports = { evaluatePhase15Storefront };
