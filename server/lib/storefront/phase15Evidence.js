/**
 * Phase 15 storefront service evidence.
 * Does not start a browser and does not open a checkout while sales are locked.
 */
const os = require("os");
const path = require("path");
const { resolveDbPath } = require("../dbPaths");
const { validateHubSeoCoverage, resolveHubLabel } = require("./hubSeoLocaleService");
const { evaluateDevice } = require("../security/deviceStandard");
const { htmlDirForLanguage } = require("../i18n/rtlDir");
const supportedLocales = require("../../../lib/i18n/supported-locales.json");
const fs = require("fs");
const { searchAndSort } = require("../pim/catalogSearchSort");
const cart = require("../cartCheckout");
const { evaluateSalesGate } = require("../salesSafetyGate");

function writesAllowed() {
  const resolved = path.resolve(resolveDbPath());
  if (resolved.includes(`${path.sep}workspace${path.sep}`)) return false;
  if (path.basename(resolved) === "buzzard.db" && resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) return false;
  return process.env.VITEST === "true" || resolved.startsWith(`${os.tmpdir()}${path.sep}`) || resolved.startsWith("/tmp/");
}

function readBrowserEvidence() {
  const dir = path.join(__dirname, "../../../docs/software-completion/t15-2");
  const reportPath = path.join(dir, "locales.json");
  if (!fs.existsSync(reportPath)) return { ok: false, reason: "missing locales.json" };
  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch {
    return { ok: false, reason: "locales.json is not readable" };
  }
  if (!Array.isArray(rows) || rows.length !== supportedLocales.length) {
    return { ok: false, reason: "locale count" };
  }
  const seen = new Set();
  for (const row of rows) {
    const code = row && row.code;
    if (!supportedLocales.includes(code) || seen.has(code)) return { ok: false, reason: `locale ${code}` };
    seen.add(code);
    const expectedDir = code === "ar" ? "rtl" : "ltr";
    const headerWidth = row.headerBox && row.headerBox.width;
    const pass = row.lang === code
      && row.dir === expectedDir
      && row.placeholderOk === true
      && row.homeOk === true
      && row.categoriesOk === true
      && row.categoryOk === true
      && row.panelHasWomen === true
      && row.panelHasDress === true
      && row.countryOk === true
      && row.searchVisible === true
      && row.typed === "sku"
      && row.panelVisible === true
      && row.mixedTurkish === false
      && row.mixedGerman === false
      && row.hydrationError === false
      && Array.isArray(row.consoleErrors)
      && row.consoleErrors.length === 0
      && headerWidth > 100;
    if (!pass) return { ok: false, reason: `checks ${code}` };
    for (const shot of ["desktop", "categories", "mobile"]) {
      const shotPath = path.join(dir, "locales", `${code}-${shot}.png`);
      if (!fs.existsSync(shotPath) || fs.statSync(shotPath).size < 8000) {
        return { ok: false, reason: `screenshot ${code}-${shot}` };
      }
    }
  }
  return { ok: seen.size === supportedLocales.length, locales: seen.size };
}

function runPhase15Evidence() {
  if (!writesAllowed()) return { ok: false, code: "REFUSED_PRODUCTION_DB", live: false, productionReady: false };
  const hub = validateHubSeoCoverage();
  const device = evaluateDevice({});
  const filled = evaluateDevice({
    full_disk_encryption: true,
    strong_pin_or_password: true,
    mfa: true,
    recovery_keys_in_vault: true,
    remote_lock: true,
    cryptographic_wipe_not_physical_destruction: true,
    session_audit: true,
    backup_restore_test: true,
    attestedFromDevice: false,
  });
  const found = searchAndSort(
    [
      { sku: "PHASE15-SYN", title: "Synthetic brake pad", price: 20, stock: 3 },
      { sku: "OTHER", title: "Other", price: 5, stock: 1 },
    ],
    { q: "brake", sort: "price", order: "asc" }
  );
  const de = cart.createCart({ country: "DE", currency: "EUR" });
  const fr = cart.createCart({ country: "FR", currency: "EUR" });
  const invalid = cart.addCartItem(de.cartToken, { sku: "PHASE15-SYN", quantity: 0 });
  const first = cart.addCartItem(de.cartToken, { sku: "PHASE15-SYN", title: "Synthetic brake pad", quantity: 1, unitPrice: 20 });
  const second = cart.addCartItem(de.cartToken, { sku: "PHASE15-SYN", title: "Synthetic brake pad", quantity: 1, unitPrice: 20 });
  const frItem = cart.addCartItem(fr.cartToken, { sku: "PHASE15-SYN", title: "Synthetic brake pad", quantity: 1, unitPrice: 20 });
  const checkout = cart.createCheckoutSession({ cartToken: de.cartToken, email: "synthetic@example.test" });
  const complete = cart.completeCheckoutSession("missing-token");
  const sales = evaluateSalesGate();
  const deLabel = resolveHubLabel("cat-05", "de");
  const trLabel = resolveHubLabel("cat-05", "tr");
  const browser = readBrowserEvidence();
  const ok = hub.ok === true
    && hub.missingPrimary.length === 0
    && device.ok === false
    && device.missing.length > 0
    && device.completeClaim === false
    && filled.completeClaim === false
    && Array.isArray(supportedLocales)
    && supportedLocales.length >= 30
    && htmlDirForLanguage("ar") === "rtl"
    && htmlDirForLanguage("de") === "ltr"
    && found.liveIndex === false
    && found.items.some((item) => item.sku === "PHASE15-SYN")
    && invalid.status === 400
    && first.items.length === 1
    && first.items[0].qty === 1
    && second.items[0].qty === 2
    && frItem.taxRate === 20
    && first.taxRate === 19
    && checkout.code === "sales_disabled"
    && checkout.status === 403
    && complete.code === "sales_disabled"
    && sales.status === "LOCKED"
    && deLabel.length > 0
    && trLabel.length > 0
    && deLabel !== trLabel
    && browser.ok === true;
  return {
    ok,
    hubs: hub.activeHubs,
    locales: supportedLocales.length,
    rtl: htmlDirForLanguage("ar"),
    deviceMissing: device.missing.length,
    checkout: checkout.code,
    deTax: first.taxRate,
    frTax: frItem.taxRate,
    deLabel,
    trLabel,
    browserVerified: browser.ok === true,
    browserLocales: browser.locales || 0,
    live: false,
    productionReady: false,
  };
}

module.exports = { runPhase15Evidence };
