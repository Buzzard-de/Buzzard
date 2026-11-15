import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const chrome = require("../lib/commerce/storefrontChrome");
const hierarchy = require("../lib/commerce/categoryHierarchy");
const adapter = require("../lib/commerce/storefrontCatalogAdapter");
const pim = require("../lib/commerce/pimReadOnlyAdapter");
const { render } = require("../lib/commerce/storefrontView");
const { openCatalog } = require("../lib/commerce/isolatedCatalog");
const { createMemoryStore } = require("../lib/pusat/memory");

const DB_MTIME = 1794331370;

test("thirty locales have the same storefront keys and stay unreviewed", () => {
  const rows = chrome.coverage();
  assert.equal(rows.length, 30);
  for (const row of rows) {
    assert.equal(row.present, row.keys);
    assert.equal(row.missing.length, 0);
    assert.equal(row.placeholder, true);
    assert.equal(row.humanReviewed, false);
    assert.equal(row.review, "UNREVIEWED");
  }
  assert.equal(chrome.chrome("de").provenance, "SOURCE_DE");
  assert.equal(chrome.chrome("fr").provenance, "MACHINE_DRAFT");
  assert.equal(chrome.chrome("ar").dir, "rtl");
  assert.equal(chrome.chrome("tr").strings.sales, "Satış kapalı");
  assert.equal(chrome.chrome("<script>").code, "LOCALE_REJECTED");
  const upper = "i".toLocaleUpperCase("tr");
  assert.equal(upper, "İ");
});

test("the master hierarchy stays at 50 codes and does not invent children", () => {
  const tree = hierarchy.validateHierarchy();
  assert.equal(tree.ok, true);
  assert.equal(tree.count, 50);
  assert.equal(tree.retired.includes("bz.20"), true);
  assert.equal(tree.officialChildren, 0);
  assert.equal(tree.subcategoryStatus, "TAXONOMY_DATA_REQUIRED");
  assert.equal(tree.cycles, 0);
  const trail = hierarchy.breadcrumb("bz.01");
  assert.equal(trail.crumbs[0].code, "bz.01");
  assert.equal(trail.childStatus, "TAXONOMY_DATA_REQUIRED");
  assert.equal(hierarchy.breadcrumb("bz.20").code, "RETIRED_CATEGORY");
  const cycle = hierarchy.validateNodes([
    { id: "synthetic-a", parent: "synthetic-b" },
    { id: "synthetic-b", parent: "synthetic-a" },
  ]);
  assert.equal(cycle.ok, false);
  assert.equal(cycle.cycles.length > 0, true);
  assert.equal(tree.synthetic, false);
  assert.equal(tree.locale, "de");
  assert.deepEqual(tree.categoryNameLocales, ["de"]);
  assert.equal(tree.categoryNameStatus, "TAXONOMY_DATA_REQUIRED");
  assert.equal(tree.orphans.length, 0);
});

test("the read-only PIM adapter does not open the development database", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "server/lib/commerce/pimReadOnlyAdapter.js"), "utf8");
  assert.equal(/require\(["'][^"']*db/.test(source), false);
  assert.equal(source.includes("catalogReadService"), false);
  assert.equal(source.includes("better-sqlite3"), false);
  const before = fs.statSync("/workspace/server/data/buzzard.db").mtimeMs;
  const listed = pim.list({ locale: "de" });
  const missing = pim.product("no-such-id", "de");
  const fds = fs.readdirSync("/proc/self/fd").map((fd) => {
    try { return fs.readlinkSync(`/proc/self/fd/${fd}`); } catch { return ""; }
  });
  assert.equal(pim.status().architecture, "PIM_ARCHITECTURE_READY");
  assert.equal(pim.status().liveData, "PIM_LIVE_DATA_BLOCKED");
  assert.equal(pim.status().live, false);
  assert.equal(listed.openedDevDb, false);
  assert.equal(listed.orderCreated, false);
  assert.equal(listed.items[0].price, "UNKNOWN");
  assert.equal(listed.items[0].supplierCost, null);
  assert.equal(JSON.stringify(listed).includes("12.34"), false);
  assert.equal(missing.code, "PIM_DATA_UNAVAILABLE");
  assert.equal(fds.some((entry) => entry.includes("buzzard.db")), false);
  assert.equal(fs.statSync("/workspace/server/data/buzzard.db").mtimeMs, before);
});

test("the adapter stays off by default and hides supplier cost when enabled", () => {
  const before = fs.statSync("/workspace/server/data/buzzard.db").mtimeMs;
  const off = adapter.read({ locale: "de" }, {});
  assert.equal(off.selected, "EXISTING_SAFE");
  assert.equal(adapter.readerPlan({}).reader, "EXISTING");
  assert.equal(adapter.readerPlan({}).openedDevDb, false);
  assert.equal(off.openedDevDb, false);
  assert.equal(off.orderEnabled, false);
  const missing = adapter.read({ locale: "de" }, { BUZZARD_ISOLATED_CATALOG: "1" });
  assert.equal(missing.selected, "ISOLATED_PATH_REQUIRED");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-next-"));
  const dbPath = path.join(dir, "catalog.sqlite");
  const env = { BUZZARD_ISOLATED_CATALOG: "1", BUZZARD_ISOLATED_CATALOG_PATH: dbPath };
  assert.equal(adapter.readerPlan(env).reader, "ISOLATED_SNAPSHOT");
  assert.equal(adapter.readerPlan(env).openedDevDb, false);
  const listed = adapter.read({ locale: "fr", q: "bremsbelag" }, env);
  const detail = adapter.product("syn-pad", { locale: "de" }, env);
  const order = adapter.placeOrder();
  assert.equal(listed.selected, "ISOLATED");
  assert.equal(listed.openedDevDb, false);
  assert.equal(listed.items[0].price, "UNKNOWN");
  assert.equal(JSON.stringify(listed).includes("12.34"), false);
  const snap = adapter.publicSnapshot(env);
  assert.equal(JSON.stringify(snap).includes("12.34"), false);
  assert.equal(JSON.stringify(snap).includes("buzzard.db"), false);
  assert.equal(snap.locales.length, 30);
  assert.equal(JSON.stringify(listed).includes("buzzard.db"), false);
  assert.equal(detail.breadcrumb.crumbs[0].name.includes("Automotive"), true);
  assert.equal(detail.cartEnabled, false);
  assert.equal(detail.checkoutEnabled, false);
  assert.equal(detail.quote.code, "MISSING_SHIPPING");
  assert.equal(order.code, "SALES_CLOSED");
  assert.equal(order.orderCreated, false);
  assert.equal(adapter.read({ locale: "de", category: "bz.20" }, env).code, "RETIRED_CATEGORY");
  const seeded = openCatalog(dbPath);
  const hostile = seeded.insertProduct({
    id: "syn-xss",
    sku: "SYN-XSS2",
    category: "bz.04",
    translations: { de: { title: "<img src=x onerror=alert(1)>", description: "Muster" } },
  });
  seeded.close();
  assert.equal(hostile.ok, true);
  const page = renderCatalog(dbPath, "/product/syn-xss?lang=de");
  assert.equal(page.includes("<img src=x"), false);
  assert.equal(page.includes("&lt;img"), true);
  assert.equal(page.includes("max-width:640px"), true);
  assert.equal(page.includes("min-width:641px"), true);
  const injected = adapter.read({ q: "' OR 1=1 --", locale: "de" }, env);
  assert.equal(injected.total, 0);
  assert.equal(adapter.product("../buzzard.db", {}, env).code, "PATH_REJECTED");
  assert.throws(() => adapter.read({ locale: "de" }, { BUZZARD_ISOLATED_CATALOG: "1", BUZZARD_ISOLATED_CATALOG_PATH: "/workspace/server/data/buzzard.db" }), /DEV_DB_FORBIDDEN/);
  const memory = createMemoryStore();
  memory.putPersonal("sinan_bey", { key: "note", value: "local" });
  assert.equal(memory.getPersonal("sinan_bey", "esat_bey").code, "PERSONAL_MEMORY_DENIED");
  const after = fs.statSync("/workspace/server/data/buzzard.db").mtimeMs;
  assert.equal(Math.trunc(before / 1000), DB_MTIME);
  assert.equal(after, before);
  fs.rmSync(dir, { recursive: true, force: true });
});

function renderCatalog(dbPath, url) {
  const catalog = openCatalog(dbPath);
  try {
    return render(catalog, url);
  } finally {
    catalog.close();
  }
}
