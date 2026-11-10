import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { openCatalog, upper, formatNumber } = require("../lib/commerce/isolatedCatalog");
const { render, startPreview } = require("../lib/commerce/storefrontView");

function tempCatalog() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-catalog-"));
  const catalog = openCatalog(path.join(dir, "catalog.sqlite"));
  return { dir, catalog };
}

test("navigation keeps retired categories closed and ids stable", () => {
  const { dir, catalog } = tempCatalog();
  const nav = catalog.categories();
  assert.equal(nav.liveMarketplaceMap, false);
  assert.equal(nav.retired.includes("bz.20"), true);
  assert.equal(nav.items.some((item) => item.code === "bz.20"), false);
  assert.equal(nav.count, 50);
  assert.equal(catalog.restoreRetired().code, "CATEGORY_RETIRED_LOCKED");
  const retired = catalog.insertProduct({
    id: "syn-retired",
    sku: "SYN-RETIRED",
    category: "bz.20",
    translations: { de: { title: "Nein", description: "Nein" } },
  });
  assert.equal(retired.code, "RETIRED_CATEGORY");
  const listed = catalog.search({ category: "bz.20" });
  assert.equal(listed.code, "RETIRED_CATEGORY");
  catalog.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("search, filter, sort, pagination, and missing facts stay unknown", () => {
  const { dir, catalog } = tempCatalog();
  const byName = catalog.search({ q: "bremsbelag" });
  const bySku = catalog.search({ sku: "SYN-PAD" });
  const byBrand = catalog.search({ brand: "SYNTHETIC" });
  const byMaker = catalog.search({ manufacturer: "SYN-MFG" });
  const byCategory = catalog.search({ category: "bz.01" });
  const byAttribute = catalog.search({ attribute: "position:front" });
  const hidden = catalog.detail("syn-hidden");
  const detail = catalog.detail("syn-pad", { locale: "fr" });
  const sorted = catalog.search({ sort: "name", direction: "desc" });
  assert.equal(byName.total, 1);
  assert.equal(bySku.items[0].sku, "SYN-PAD");
  assert.equal(byBrand.total, 2);
  assert.equal(byMaker.total, 2);
  assert.equal(byCategory.items.every((item) => item.category.code === "bz.01"), true);
  assert.equal(byAttribute.total, 1);
  assert.equal(hidden.code, "NOT_PUBLIC");
  assert.equal(detail.product.price, "UNKNOWN");
  assert.equal(detail.product.shipping, "UNKNOWN");
  assert.equal(detail.product.availability, "UNKNOWN");
  assert.equal(detail.product.discount, null);
  assert.equal(detail.product.subcategory, "UNKNOWN");
  assert.equal(detail.product.translationStatus, "MISSING_TRANSLATION");
  assert.equal(detail.product.untranslated.includes("title"), true);
  assert.equal(detail.product.title, null);
  assert.equal(detail.quote.publicPrice, "UNKNOWN");
  assert.equal(detail.quote.code, "MISSING_SHIPPING");
  assert.equal(JSON.stringify(detail).includes("12.34"), false);
  assert.equal(sorted.items[0].sku === sorted.items[1].sku, false);
  assert.equal(catalog.search({ sort: "price" }).priceSort, "UNAVAILABLE");
  for (let i = 0; i < 30; i += 1) {
    catalog.insertProduct({
      id: `syn-extra-${i}`,
      sku: `SYN-EXTRA-${i}`,
      category: "bz.02",
      translations: { de: { title: `Muster ${String(i).padStart(2, "0")}`, description: "Muster" } },
    });
  }
  const page = catalog.search({ category: "bz.02", page: 3, limit: 12 });
  const beyond = catalog.search({ category: "bz.02", page: 9, limit: 12 });
  assert.equal(page.items.length, 6);
  assert.equal(beyond.items.length, 0);
  assert.equal(beyond.total, 30);
  catalog.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("pricing gates, sales, injection, and isolation reject unsafe input", () => {
  const { dir, catalog } = tempCatalog();
  assert.equal(catalog.quote({ offerPrice: 0, supplierCost: 1, shippingCost: 1 }).code, "PRICE_INVALID");
  assert.equal(catalog.quote({ offerPrice: -5, supplierCost: 1, shippingCost: 1 }).code, "PRICE_INVALID");
  assert.equal(catalog.quote({ offerPrice: 40, supplierCost: null, shippingCost: 1 }).code, "MISSING_SUPPLIER_COST");
  assert.equal(catalog.quote({ offerPrice: 40, supplierCost: 10, shippingCost: null }).code, "MISSING_SHIPPING");
  assert.equal(catalog.quote({ offerPrice: 40, supplierCost: 10, shippingCost: 1, country: "ZZ" }).code, "VAT_UNKNOWN");
  assert.equal(catalog.quote({ offerPrice: 40, supplierCost: 10, shippingCost: 1, fx: null }).code, "FX_UNKNOWN");
  assert.equal(catalog.quote({ offerPrice: 10, supplierCost: 9.8, shippingCost: 0 }).code, "MIN_NET_PROFIT");
  assert.equal(catalog.quote({ offerPrice: 40, supplierCost: 10, shippingCost: 1, currency: "BTC" }).code, "REJECTED_CRYPTO_POLICY");
  const read = catalog.quote({ offerPrice: 40, supplierCost: 10, shippingCost: 1, country: "DE" });
  assert.equal(read.ok, true);
  assert.equal(read.vatRate, 19);
  assert.equal(read.livePrice, false);
  assert.equal(read.orderCreated, false);
  assert.equal(Object.hasOwn(read, "supplierCost"), false);
  const duplicate = catalog.insertProduct({
    id: "syn-copy",
    sku: "SYN-PAD",
    category: "bz.01",
    translations: { de: { title: "Kopie", description: "Kopie" } },
  });
  assert.equal(duplicate.code, "DUPLICATE_SKU");
  const hostile = catalog.insertProduct({
    id: "syn-xss",
    sku: "SYN-XSS",
    category: "bz.04",
    translations: { de: { title: "<img src=x onerror=alert(1)>", description: "Muster" } },
  });
  assert.equal(hostile.ok, true);
  const html = render(catalog, "/product/syn-xss?lang=de");
  assert.equal(html.includes("<img src=x"), false);
  assert.equal(html.includes("&lt;img"), true);
  assert.equal(html.includes("buzzard.db"), false);
  const injected = catalog.search({ q: "' OR 1=1 --" });
  assert.equal(injected.total, 0);
  assert.equal(catalog.search({ q: "a\0b" }).code, "MALFORMED_QUERY");
  assert.equal(catalog.detail("../buzzard.db").code, "PATH_REJECTED");
  assert.equal(catalog.detail("").code, "PATH_REJECTED");
  assert.equal(catalog.internalCosts("banu_hanim").code, "PERMISSION_DENIED");
  assert.equal(catalog.internalCosts("pricing_ai").ok, true);
  const card = catalog.serviceCard("syn-pad");
  assert.equal(card.leakedCost, false);
  assert.equal(card.leakedPath, false);
  assert.equal(catalog.placeOrder().code, "SALES_CLOSED");
  assert.equal(catalog.placeOrder().orderCreated, false);
  let limited = null;
  for (let i = 0; i < 61; i += 1) limited = catalog.search({ q: "muster", actor: "burst" });
  assert.equal(limited.code, "RATE_LIMITED");
  assert.equal(catalog.search({ market: "ZZ" }).code, "MARKET_UNKNOWN");
  catalog.close();
  assert.throws(() => openCatalog(path.join(dir, "buzzard.db")), /DEV_DB_FORBIDDEN/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("locale presentation, layout, and local latency stay labeled synthetic", async () => {
  assert.equal(upper("i", "tr"), "İ");
  assert.equal(upper("I", "tr").toLocaleLowerCase("tr"), "ı");
  assert.equal(formatNumber(1234.5, "de").includes("."), true);
  assert.notEqual(formatNumber(1234.5, "de"), formatNumber(1234.5, "en"));
  const { dir, catalog } = tempCatalog();
  const arabic = render(catalog, "/product/syn-pad?lang=ar");
  const french = render(catalog, "/product/syn-pad?lang=fr");
  const home = render(catalog, "/?lang=de");
  const empty = render(catalog, "/search?q=zzzz-no-such&lang=en");
  const bad = render(catalog, "/product/missing-id");
  assert.equal(arabic.includes('dir="rtl"'), true);
  assert.equal(french.includes("MISSING_TRANSLATION"), true);
  assert.equal(home.includes("Verkauf geschlossen"), true);
  assert.equal(home.includes('src="/logo/logo.png"'), true);
  assert.equal(home.includes("#c9a227"), true);
  assert.equal(home.includes("max-width:1024px"), true);
  assert.equal(home.includes("max-width:640px"), true);
  assert.equal(home.includes('data-state="loading"'), true);
  assert.equal(home.includes("PLACEHOLDER"), true);
  assert.equal(empty.includes('data-state="empty"'), true);
  assert.equal(bad.includes("NOT_FOUND"), true);
  const started = process.hrtime.bigint();
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 50; i += 1) catalog.search({ q: "synthetic", actor: "perf" });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const heapDelta = process.memoryUsage().heapUsed - before;
  assert.equal(elapsedMs < 3000, true);
  const preview = await startPreview({ dbPath: path.join(dir, "preview.sqlite"), port: 0 });
  const response = await fetch(`${preview.url}/?lang=tr`);
  const logo = await fetch(`${preview.url}/logo/logo.png`);
  const body = await response.text();
  assert.equal(response.headers.get("x-buzzard-sales"), "closed");
  assert.equal(body.includes("Satış kapalı"), true);
  assert.equal(body.includes("MISSING_TRANSLATION category.name"), true);
  assert.equal(logo.status, 200);
  assert.equal(logo.headers.get("content-type"), "image/png");
  await preview.close();
  const report = {
    schema: "buzzard.storefront-catalog.v1",
    recordedAt: new Date().toISOString(),
    liveVerified: false,
    productionPerformance: false,
    salesEnabled: false,
    orderCreated: false,
    localSearch: { calls: 50, elapsedMs: Math.round(elapsedMs * 100) / 100, heapDeltaBytes: heapDelta },
    tasks: [
      "CATEGORY_NAV",
      "RETIRED_CATEGORY",
      "SEARCH_FILTER_SORT",
      "PAGINATION",
      "MISSING_FACTS",
      "MISSING_TRANSLATION",
      "PRICE_GATES",
      "SALES_CLOSED",
      "XSS_SQL_PATH",
      "ISOLATION",
      "RTL_LAYOUT",
      "LOCAL_LATENCY",
    ].map((id) => ({ id, status: "TEST_COMPLETE", liveVerified: false })),
  };
  const checkpoint = path.join(process.cwd(), "data/completion/storefront-catalog-checkpoint.json");
  fs.writeFileSync(checkpoint, JSON.stringify(report, null, 2));
  catalog.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
