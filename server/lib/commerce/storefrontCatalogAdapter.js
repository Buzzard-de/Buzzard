/**
 * Read-only storefront adapter.
 * The isolated catalog is off unless BUZZARD_ISOLATED_CATALOG=1 and a safe path is set.
 * The default does not open the development database and does not replace the existing reader.
 */
const { openCatalog } = require("./isolatedCatalog");
const { chrome } = require("./storefrontChrome");
const { breadcrumb, validateHierarchy } = require("./categoryHierarchy");
const { isSalesEnabled } = require("../salesMode");

function isEnabled(env = process.env) {
  return env.BUZZARD_ISOLATED_CATALOG === "1";
}

function guard(env = process.env) {
  if (!isEnabled(env)) {
    return { ok: true, selected: "EXISTING_SAFE", openedDevDb: false };
  }
  const configured = env.BUZZARD_ISOLATED_CATALOG_PATH;
  if (!configured) return { ok: false, selected: "ISOLATED_PATH_REQUIRED", openedDevDb: false };
  return { ok: true, selected: "ISOLATED", path: configured, openedDevDb: false };
}

function withCatalog(env, fn) {
  const gate = guard(env);
  if (!gate.ok || gate.selected !== "ISOLATED") return gate;
  const catalog = openCatalog(gate.path);
  try {
    return fn(catalog);
  } finally {
    catalog.close();
  }
}

function read(query = {}, env = process.env) {
  const gate = guard(env);
  if (gate.selected !== "ISOLATED") {
    return { ...gate, items: [], salesEnabled: false, orderEnabled: false, live: false };
  }
  const locale = chrome(query.locale || "de");
  return withCatalog(env, (catalog) => {
    const listed = catalog.search({
      locale: locale.locale,
      q: query.q || undefined,
      category: query.category || undefined,
      page: query.page,
      limit: query.limit,
      sort: query.sort === "price" ? "price" : query.sort,
      brand: query.brand,
      manufacturer: query.manufacturer,
      attribute: query.attribute,
      sku: query.sku,
      actor: query.actor || "storefront",
      measure: query.measure !== false,
    });
    return {
      selected: "ISOLATED",
      openedDevDb: false,
      locale: locale.locale,
      dir: locale.dir,
      review: locale.review,
      humanReviewed: false,
      ...listed,
      salesEnabled: isSalesEnabled(),
      orderEnabled: false,
      live: false,
    };
  });
}

function product(id, query = {}, env = process.env) {
  const gate = guard(env);
  if (gate.selected !== "ISOLATED") return { ...gate, orderEnabled: false, salesEnabled: false };
  const locale = chrome(query.locale || "de");
  return withCatalog(env, (catalog) => {
    const detail = catalog.detail(id, { locale: locale.locale });
    const trail = detail.ok ? breadcrumb(detail.product.category.code) : null;
    return {
      selected: "ISOLATED",
      openedDevDb: false,
      locale: locale.locale,
      dir: locale.dir,
      ...detail,
      breadcrumb: trail,
      orderEnabled: false,
      cartEnabled: false,
      checkoutEnabled: false,
      paymentEnabled: false,
      salesEnabled: isSalesEnabled(),
    };
  });
}

function readerPlan(env = process.env) {
  const gate = guard(env);
  if (gate.selected !== "ISOLATED") {
    return { reader: "EXISTING", openedDevDb: false, useExistingReader: true, reason: "FLAG_OFF" };
  }
  return { reader: "ISOLATED_SNAPSHOT", openedDevDb: false, useExistingReader: false, reason: "PIM_IMPORT_OPENS_DEV_DB" };
}

function placeOrder() {
  return { ok: false, code: "SALES_CLOSED", orderCreated: false, moneyMoved: false, salesEnabled: isSalesEnabled() };
}

function hierarchy() {
  return validateHierarchy();
}

function publicSnapshot(env = process.env) {
  const gate = guard(env);
  const locales = require("./storefrontChrome").LOCALES.map((code) => chrome(code));
  if (gate.selected !== "ISOLATED") {
    return { selected: gate.selected, sales: "SALES_CLOSED", locales, itemsByLocale: {}, detailByLocale: {}, ids: [] };
  }
  const itemsByLocale = {};
  const detailByLocale = {};
  for (const locale of locales) {
    const listed = read({ locale: locale.locale, limit: 24, measure: false }, env);
    itemsByLocale[locale.locale] = listed.items || [];
  }
  const ids = (itemsByLocale.de || []).map((item) => item.id);
  for (const id of ids) {
    detailByLocale[id] = {};
    for (const locale of locales) {
      const result = product(id, { locale: locale.locale }, env);
      if (result.ok && result.product) {
        detailByLocale[id][locale.locale] = { ...result.product, quoteCode: result.quote?.code || "UNKNOWN" };
      }
    }
  }
  return { selected: "ISOLATED", sales: "SALES_CLOSED", locales, itemsByLocale, detailByLocale, ids };
}

module.exports = { isEnabled, guard, read, product, placeOrder, hierarchy, publicSnapshot, readerPlan };
