/**
 * Read-only PIM view for the storefront phase.
 * The data source is the isolated public snapshot.
 * It does not load the development database module and does not write product or inventory rows.
 */
const fs = require("fs");
const path = require("path");

const SNAPSHOT = path.join(__dirname, "..", "..", "..", "data", "storefront", "isolated-public-snapshot.json");

const PIM_ARCHITECTURE_READY = "PIM_ARCHITECTURE_READY";
const PIM_LIVE_DATA_BLOCKED = "PIM_LIVE_DATA_BLOCKED";

function readSnapshot() {
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
  } catch {
    return null;
  }
}

function card(item) {
  return {
    id: item.id || null,
    sku: item.sku || null,
    title: item.title || null,
    brand: item.brand || "UNKNOWN",
    manufacturer: item.manufacturer || "UNKNOWN",
    category: item.category?.code || "UNKNOWN",
    translationStatus: item.translationStatus || (item.title ? "PRESENT" : "MISSING_TRANSLATION"),
    price: item.price || "UNKNOWN",
    shipping: item.shipping || "UNKNOWN",
    availability: item.availability || "UNKNOWN",
    returns: item.returns || "UNKNOWN",
    photograph: item.photograph || "PLACEHOLDER",
    supplierCost: null,
  };
}

function list({ locale = "de", q } = {}) {
  const snap = readSnapshot();
  if (!snap || snap.selected !== "ISOLATED") {
    return { ok: false, code: "PIM_DATA_UNAVAILABLE", openedDevDb: false, orderCreated: false, items: [] };
  }
  const items = snap.itemsByLocale?.[locale];
  if (!Array.isArray(items)) {
    return { ok: false, code: "MISSING_TRANSLATION", openedDevDb: false, orderCreated: false, items: [] };
  }
  const needle = String(q || "").toLocaleLowerCase(locale);
  const matched = needle
    ? items.filter((item) => `${item.title || ""} ${item.sku || ""}`.toLocaleLowerCase(locale).includes(needle))
    : items;
  return {
    ok: true,
    code: "ISOLATED_SNAPSHOT",
    openedDevDb: false,
    orderCreated: false,
    salesEnabled: false,
    items: matched.map(card),
  };
}

function product(id, locale = "de") {
  const snap = readSnapshot();
  if (!snap || snap.selected !== "ISOLATED") {
    return { ok: false, code: "PIM_DATA_UNAVAILABLE", openedDevDb: false, orderCreated: false, price: "UNKNOWN", stock: "UNKNOWN", shipping: "UNKNOWN" };
  }
  const row = snap.detailByLocale?.[id]?.[locale];
  if (!row) {
    return { ok: false, code: "PIM_DATA_UNAVAILABLE", openedDevDb: false, orderCreated: false, price: "UNKNOWN", stock: "UNKNOWN", shipping: "UNKNOWN" };
  }
  return { ok: true, code: "ISOLATED_SNAPSHOT", openedDevDb: false, orderCreated: false, product: card(row), price: row.price || "UNKNOWN", stock: row.availability || "UNKNOWN", shipping: row.shipping || "UNKNOWN" };
}

function status() {
  return {
    architecture: PIM_ARCHITECTURE_READY,
    liveData: PIM_LIVE_DATA_BLOCKED,
    reason: "The server PIM reader imports the development database module",
    openedDevDb: false,
    live: false,
  };
}

module.exports = { list, product, status, PIM_ARCHITECTURE_READY, PIM_LIVE_DATA_BLOCKED };
