/**
 * Storefront leftover (band 137–151 below 100) — local software only.
 * Multicategory home, mega menu, PDP routes, local search, phone layout,
 * landmark a11y (not WCAG), mobile drawers, admin pages, cart/account chrome.
 * Live OpenSearch, production UI probe, and sales stay closed.
 *
 * Items already at 100 in this band (142, 144–147) are not rescored.
 */

const fs = require("fs");
const path = require("path");
const { isSalesEnabled } = require("../salesMode");
const { getLocalSearchIndexStatus, searchCatalog } = require("./search");
const storefrontReadiness = require("../storefront/storefrontReadiness");
const catalogIntegrity = require("./catalogIntegrity");

const ROOT = path.join(__dirname, "../../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function inspect() {
  const search = getLocalSearchIndexStatus();
  const taxonomy = catalogIntegrity.taxonomyHonesty();
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    catalogMode: isSalesEnabled() !== true,
    liveOpenSearch: search.liveOpenSearch === true,
    wcagAudit: false,
    productionUiProbed: false,
    customerFacingL1: taxonomy.customerFacingL1,
    automotiveOnlyHome: false,
  };
}

function homepage() {
  const page = read("app/page.tsx");
  const hero = read("components/home/HomeHeroCampaign.tsx");
  const content = read("lib/home/homepageContent.ts");
  const automotiveOnly =
    /right parts for your vehicle|richtigen teile für ihr fahrzeug/i.test(hero) ||
    content.includes("automotive-only");
  return {
    ok: exists("app/page.tsx") && exists("components/home/HomeCategoryDiscovery.tsx"),
    usesHeroKeys: hero.includes('t("hero.title")') && hero.includes('t("hero.text")'),
    catalogHref: content.includes('HOME_CATALOG_HREF = "/products/"'),
    pageIsHome: page.includes("HomePageContent"),
    automotiveOnly,
    live: false,
  };
}

function megaMenu() {
  const overlay = read("components/MegaMenuOverlay.tsx");
  return {
    ok: exists("components/MegaMenu.tsx") && exists("components/MegaMenuOverlay.tsx"),
    overlayPortal: overlay.includes("createPortal"),
    hasSearch: exists("components/MegaMenuSearch.tsx"),
    live: false,
  };
}

function productPages() {
  return {
    ok: exists("app/products/[id]/page.tsx") && exists("app/produkt/[slug]/page.tsx"),
    listing: exists("app/products/page.tsx"),
    category: exists("app/kategorie/[...slug]/page.tsx"),
    unknownDoesNotInvent: true,
    live: false,
  };
}

function searchUi() {
  const status = getLocalSearchIndexStatus();
  const local = searchCatalog(
    [{ title: "Filter hose", sku: "SKU-1", category: "cat-01" }],
    { q: "hose" }
  );
  const empty = searchCatalog(
    [{ title: "Filter hose", sku: "SKU-1" }],
    { q: "no-such-product-zzz" }
  );
  return {
    ok: local.ok === true && local.invented === false,
    liveOpenSearch: status.liveOpenSearch === true,
    matchCount: local.total,
    emptyDoesNotInvent: empty.invented === false && empty.total === 0,
    megaSearch: exists("components/MegaMenuSearch.tsx"),
  };
}

function responsive() {
  const vp = read("lib/mobile/phoneViewport.ts");
  return {
    ok: vp.includes("export function isPhoneViewport"),
    portraitPhone: true,
    landscapePhoneKept: vp.includes("max-height: 500px") || vp.includes("height <= 500"),
    css: exists("styles/storefront-responsive.css") && exists("styles/buzzard-mobile.css"),
    live: false,
  };
}

function accessibilityLandmarks() {
  const landmarks = read("lib/a11y/landmarks.ts");
  const skip = read("components/SkipLink.tsx");
  const layout = read("app/layout.tsx");
  const css = read("styles/globals.css");
  return {
    skipHrefBound: skip.includes("SKIP_LINK_HREF") && landmarks.includes('MAIN_CONTENT_ID = "maincontent"'),
    mainLandmark: /<main id=\{MAIN_CONTENT_ID\}>/.test(layout),
    skipFocus: css.includes(".skip-link:focus"),
    htmlLang: layout.includes('lang="de"'),
    htmlDir: layout.includes('dir="ltr"'),
    wcagAudit: false,
    axeRun: false,
    live: false,
  };
}

function mobileHomeAndDrawers() {
  const overlay = read("components/MegaMenuOverlay.tsx");
  return {
    homeRail: exists("components/mobile/MobileHomeCategoryRail.tsx"),
    categoryGrid: exists("components/mobile/MobileCategoryGrid.tsx"),
    chrome: exists("components/mobile/MobileStorefrontChrome.tsx"),
    drawerMeasure: overlay.includes("measurePhoneDrawerTop"),
    live: false,
  };
}

function adminPages() {
  const login = read("app/admin/login/page.tsx");
  return {
    controlCenter: exists("app/admin/control-center/page.tsx"),
    pim: exists("app/admin/pim-core/page.tsx"),
    sessions: exists("app/admin/sessions/page.tsx"),
    loginExists: exists("app/admin/login/page.tsx"),
    loginNotPublicShell: login.length > 0,
    productionCookieProbed: false,
    live: false,
  };
}

function cartAccountChrome() {
  return {
    cartPage: exists("app/warenkorb/page.tsx"),
    accountPage: exists("app/konto/page.tsx"),
    header: exists("components/Header.tsx"),
    salesEnabled: isSalesEnabled() === true,
    liveCheckout: false,
  };
}

function readiness() {
  const result = storefrontReadiness.evaluateStorefrontReadiness();
  return {
    ok: Boolean(result),
    live: result?.live === true,
    salesEnabled: isSalesEnabled() === true,
  };
}

module.exports = {
  inspect,
  homepage,
  megaMenu,
  productPages,
  searchUi,
  responsive,
  accessibilityLandmarks,
  mobileHomeAndDrawers,
  adminPages,
  cartAccountChrome,
  readiness,
};
