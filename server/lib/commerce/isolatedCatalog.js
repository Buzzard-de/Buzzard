/**
 * Isolated storefront catalog. Reads the existing category file and pricing gates.
 * Product rows live in the caller-supplied sqlite file, never in buzzard.db.
 * Unknown commercial facts stay UNKNOWN. The prototype cannot open an order.
 */
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");
const { inspectTree, suggestPlacement, restoreRetired } = require("../buzzardNative/core/specialists/categoryEngine");
const { evaluateOffer } = require("./pricingPolicy");
const { calculateVat } = require("../buzzardNative/core/tax/vatEngine");
const { decideAsset } = require("../banking/eu27/fiatPolicy");
const { isSalesEnabled } = require("../salesMode");
const { check } = require("../buzzardNative/core/permissionEngine");
const { getMarket } = require("../../core/marketEngineRegistry");

const LOCALES = require("../../../lib/i18n/supported-locales.json");
const PAGE_MAX = 24;
const SEARCH_LIMIT = 60;

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function guardPath(dbPath) {
  const resolved = path.resolve(dbPath);
  assertNotGuardian(resolved);
  if (path.basename(resolved) === "buzzard.db") throw new Error("DEV_DB_FORBIDDEN");
  if (resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) throw new Error("DEV_DB_FORBIDDEN");
  return resolved;
}

function safeId(value) {
  const id = String(value || "");
  if (!id || id.includes("\0") || id.includes("..") || id.includes("/") || id.includes("\\")) {
    return { ok: false, code: "PATH_REJECTED" };
  }
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return { ok: false, code: "MALFORMED_ID" };
  return { ok: true, id };
}

function upper(text, locale) {
  const tag = locale === "tr" ? "tr" : String(locale || "de");
  return String(text).toLocaleUpperCase(tag);
}

function formatNumber(value, locale) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return new Intl.NumberFormat(locale === "tr" ? "tr" : locale || "de").format(value);
}

function formatMoney(value, locale, currency = "EUR") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return new Intl.NumberFormat(locale === "tr" ? "tr" : locale || "de", { style: "currency", currency }).format(value);
}

function openCatalog(dbPath) {
  const resolved = guardPath(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cat_products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      supplier_ref TEXT,
      brand TEXT,
      manufacturer TEXT,
      status TEXT NOT NULL,
      category_code TEXT NOT NULL,
      country TEXT,
      attributes_json TEXT NOT NULL,
      supplier_cost REAL,
      shipping_cost REAL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cat_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      attributes_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cat_i18n (
      product_id TEXT NOT NULL,
      locale TEXT NOT NULL,
      title TEXT,
      description TEXT,
      PRIMARY KEY (product_id, locale)
    );
  `);
  const searches = new Map();
  const taxonomy = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/taxonomy/buzzard_master_50_main_categories.json"), "utf8"));
  const master = inspectTree({ actorId: "category_ai" });
  const retiredCodes = new Set(master.retired || []);
  const categoryItems = (master.codes || []).map((code) => {
    const name = (taxonomy.categories || []).find((row) => row.code === code);
    return {
      code,
      name: name ? name.name : "UNKNOWN",
      slug: name ? name.slug : "UNKNOWN",
      retired: retiredCodes.has(code),
      navigable: !retiredCodes.has(code),
      children: [],
      subcategory: "UNKNOWN",
      idsConsistent: true,
    };
  });

  function categories() {
    return {
      ok: master.ok === true,
      count: categoryItems.filter((row) => row.navigable).length,
      retired: [...retiredCodes],
      items: categoryItems,
      liveMarketplaceMap: false,
    };
  }

  function insertProduct(input) {
    const idCheck = safeId(input.id);
    if (!idCheck.ok) return idCheck;
    const placement = suggestPlacement({ actorId: "category_ai", sku: input.sku, hint: input.category });
    if (placement.rejectedRetired) return { ok: false, code: "RETIRED_CATEGORY", category: input.category };
    if (!placement.suggested) return { ok: false, code: "UNKNOWN_CATEGORY", category: input.category };
    try {
      db.prepare(
        `INSERT INTO cat_products (
          id, sku, supplier_ref, brand, manufacturer, status, category_code, country,
          attributes_json, supplier_cost, shipping_cost, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        idCheck.id,
        input.sku,
        input.supplierRef || null,
        input.brand || "SYNTHETIC",
        input.manufacturer || "UNKNOWN",
        input.status || "ACTIVE",
        placement.suggested,
        input.country || "DE",
        JSON.stringify(input.attributes || {}),
        input.supplierCost == null ? null : Number(input.supplierCost),
        input.shippingCost == null ? null : Number(input.shippingCost),
        new Date().toISOString()
      );
    } catch (error) {
      if (String(error.message).includes("UNIQUE")) return { ok: false, code: "DUPLICATE_SKU" };
      return { ok: false, code: "CATALOG_ERROR" };
    }
    for (const [locale, copy] of Object.entries(input.translations || {})) {
      if (!LOCALES.includes(locale)) continue;
      db.prepare(`INSERT INTO cat_i18n (product_id, locale, title, description) VALUES (?, ?, ?, ?)`).run(
        idCheck.id,
        locale,
        copy.title || null,
        copy.description || null
      );
    }
    for (const variant of input.variants || []) {
      db.prepare(`INSERT INTO cat_variants (id, sku, product_id, label, attributes_json) VALUES (?, ?, ?, ?, ?)`).run(
        variant.id,
        variant.sku,
        idCheck.id,
        variant.label,
        JSON.stringify(variant.attributes || {})
      );
    }
    return { ok: true, id: idCheck.id, live: false };
  }

  function seed() {
    if (db.prepare(`SELECT COUNT(*) n FROM cat_products`).get().n > 0) return { ok: true, seeded: false };
    insertProduct({
      id: "syn-pad",
      sku: "SYN-PAD",
      supplierRef: "SYN-SUP-1",
      brand: "SYNTHETIC",
      manufacturer: "SYN-MFG",
      status: "ACTIVE",
      category: "bz.01",
      country: "DE",
      attributes: { position: "front" },
      supplierCost: 12.34,
      shippingCost: null,
      translations: {
        de: { title: "Synthetisches Bremsbelag-Muster", description: "Isoliertes Muster. Kein Angebot." },
        en: { title: "Synthetic brake-pad sample", description: "Isolated sample. Not an offer." },
        tr: { title: "Sentetik fren balata örneği", description: "İzole örnek. Teklif değildir." },
        ar: { title: "عينة وسادة فرامل اصطناعية", description: "عينة معزولة. ليست عرضًا." },
      },
      variants: [
        { id: "syn-pad-a", sku: "SYN-PAD-A", label: "A", attributes: { position: "front" } },
        { id: "syn-pad-b", sku: "SYN-PAD-B", label: "B", attributes: { position: "rear" } },
      ],
    });
    insertProduct({
      id: "syn-tool",
      sku: "SYN-TOOL",
      supplierRef: "SYN-SUP-1",
      brand: "SYNTHETIC",
      manufacturer: "SYN-MFG",
      status: "ACTIVE",
      category: "bz.03",
      country: "DE",
      attributes: { power: "manual" },
      supplierCost: 8,
      shippingCost: null,
      translations: {
        de: { title: "Synthetisches Werkzeug-Muster", description: "Isoliertes Muster." },
        en: { title: "Synthetic tool sample", description: "Isolated sample." },
      },
    });
    insertProduct({
      id: "syn-hidden",
      sku: "SYN-HIDDEN",
      supplierRef: "SYN-SUP-1",
      brand: "SYNTHETIC",
      manufacturer: "SYN-MFG",
      status: "INACTIVE",
      category: "bz.01",
      country: "DE",
      attributes: {},
      supplierCost: 4,
      shippingCost: null,
      translations: { de: { title: "Inaktives Muster", description: "Nicht öffentlich." } },
    });
    return { ok: true, seeded: true };
  }

  function copyFor(productId, locale) {
    const source = db.prepare(`SELECT title, description FROM cat_i18n WHERE product_id = ? AND locale = 'de'`).get(productId);
    const local = db.prepare(`SELECT title, description FROM cat_i18n WHERE product_id = ? AND locale = ?`).get(productId, locale);
    const untranslated = [];
    if (!local || !local.title) untranslated.push("title");
    if (!local || !local.description) untranslated.push("description");
    return {
      title: local && local.title ? local.title : null,
      description: local && local.description ? local.description : null,
      sourceTitle: source ? source.title : null,
      sourceLocale: "de",
      untranslated,
      translationStatus: untranslated.length ? "MISSING_TRANSLATION" : "PRESENT",
    };
  }

  function variantsOf(productId) {
    return db.prepare(`SELECT id, sku, label, attributes_json FROM cat_variants WHERE product_id = ?`).all(productId).map((row) => ({
      id: row.id,
      sku: row.sku,
      label: row.label,
      attributes: JSON.parse(row.attributes_json),
      price: "UNKNOWN",
      availability: "UNKNOWN",
      shipping: "UNKNOWN",
    }));
  }

  function toPublic(row, locale) {
    const names = categories().items;
    const category = names.find((item) => item.code === row.category_code);
    const copy = copyFor(row.id, locale);
    return {
      id: row.id,
      sku: row.sku,
      supplierRef: row.supplier_ref,
      brand: row.brand,
      manufacturer: row.manufacturer,
      title: copy.title,
      description: copy.description,
      sourceTitle: copy.sourceTitle,
      sourceLocale: copy.sourceLocale,
      untranslated: copy.untranslated,
      translationStatus: copy.translationStatus,
      attributes: JSON.parse(row.attributes_json),
      variants: variantsOf(row.id),
      status: row.status,
      category,
      subcategory: "UNKNOWN",
      country: row.country,
      locale,
      price: "UNKNOWN",
      shipping: "UNKNOWN",
      availability: "UNKNOWN",
      discount: null,
      returns: "UNKNOWN",
      related: related(row, locale),
      photograph: "PLACEHOLDER",
      live: false,
      salesEnabled: false,
      orderEnabled: false,
    };
  }

  function related(row, locale) {
    return db
      .prepare(`SELECT id, sku FROM cat_products WHERE category_code = ? AND id != ? AND status = 'ACTIVE' LIMIT 4`)
      .all(row.category_code, row.id)
      .map((item) => ({ id: item.id, sku: item.sku, title: copyFor(item.id, locale).title, price: "UNKNOWN" }));
  }

  function detail(id, { locale = "de" } = {}) {
    const checked = safeId(id);
    if (!checked.ok) return { ok: false, code: checked.code, live: false };
    const row = db.prepare(`SELECT * FROM cat_products WHERE id = ?`).get(checked.id);
    if (!row) return { ok: false, code: "NOT_FOUND", live: false };
    if (row.status !== "ACTIVE") return { ok: false, code: "NOT_PUBLIC", live: false };
    const product = toPublic(row, LOCALES.includes(locale) ? locale : "de");
    const gate = quote({
      offerPrice: 40,
      supplierCost: row.supplier_cost,
      shippingCost: row.shipping_cost,
      country: row.country,
      currency: "EUR",
      fx: 1,
    });
    return {
      ok: true,
      product,
      quote: { code: gate.code, publicPrice: "UNKNOWN", reasons: gate.reasons || [], livePrice: false, orderCreated: false },
      leaked: false,
      live: false,
    };
  }

  function search(query = {}) {
    const actor = String(query.actor || "guest");
    if (query.measure !== false) {
      const seen = searches.get(actor) || 0;
      if (seen >= SEARCH_LIMIT) return { ok: false, code: "RATE_LIMITED", items: [], live: false };
      searches.set(actor, seen + 1);
    }
    if (query.market) {
      const market = getMarket(query.market);
      if (!market) return { ok: false, code: "MARKET_UNKNOWN", items: [], live: false };
    }
    const locale = LOCALES.includes(query.locale) ? query.locale : "de";
    if (query.q != null && (typeof query.q !== "string" || query.q.includes("\0") || query.q.length > 80)) {
      return { ok: false, code: "MALFORMED_QUERY", items: [], live: false };
    }
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const pageSize = Math.min(PAGE_MAX, Math.max(1, Number.parseInt(query.limit, 10) || 12));
    const category = query.category ? String(query.category) : null;
    if (category && retiredCodes.has(category)) {
      return { ok: false, code: "RETIRED_CATEGORY", items: [], live: false };
    }
    const rows = db.prepare(`SELECT * FROM cat_products WHERE status = 'ACTIVE'`).all();
    const q = query.q ? String(query.q).toLowerCase() : "";
    let items = rows.filter((row) => {
      const copy = copyFor(row.id, locale);
      const blob = [row.sku, row.brand, row.manufacturer, row.attributes_json, copy.title, copy.sourceTitle].join(" ").toLowerCase();
      if (q && !blob.includes(q)) return false;
      if (query.sku && row.sku !== query.sku) return false;
      if (query.brand && String(row.brand).toLowerCase() !== String(query.brand).toLowerCase()) return false;
      if (query.manufacturer && String(row.manufacturer).toLowerCase() !== String(query.manufacturer).toLowerCase()) return false;
      if (category && row.category_code !== category) return false;
      if (query.attribute) {
        const [key, value] = String(query.attribute).split(":");
        const attrs = JSON.parse(row.attributes_json);
        if (attrs[key] !== value) return false;
      }
      return true;
    });
    const priceSort = query.sort === "price" ? "UNAVAILABLE" : null;
    const sort = query.sort === "sku" || query.sort === "brand" ? query.sort : "name";
    items.sort((a, b) => {
      const av = sort === "name" ? copyFor(a.id, locale).sourceTitle || "" : a[sort === "brand" ? "brand" : "sku"];
      const bv = sort === "name" ? copyFor(b.id, locale).sourceTitle || "" : b[sort === "brand" ? "brand" : "sku"];
      return String(av).localeCompare(String(bv), locale === "tr" ? "tr" : locale);
    });
    if (query.direction === "desc") items.reverse();
    const total = items.length;
    const slice = items.slice((page - 1) * pageSize, page * pageSize).map((row) => toPublic(row, locale));
    return {
      ok: true,
      items: slice,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      empty: total === 0,
      sort,
      priceSort,
      live: false,
      salesEnabled: false,
    };
  }

  function quote({ offerPrice, supplierCost, shippingCost, country = "DE", currency = "EUR", fx = 1, assetType = "fiat" } = {}) {
    const asset = decideAsset({ currency, assetType });
    if (!asset.ok) return { ok: false, code: asset.code, publicPrice: "UNKNOWN", livePrice: false, orderCreated: false };
    if (fx == null || Number.isNaN(Number(fx))) {
      return { ok: false, code: "FX_UNKNOWN", publicPrice: "UNKNOWN", livePrice: false, orderCreated: false };
    }
    const price = Number(offerPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, code: "PRICE_INVALID", publicPrice: "UNKNOWN", livePrice: false, orderCreated: false };
    }
    if (supplierCost == null || Number.isNaN(Number(supplierCost))) {
      return { ok: false, code: "MISSING_SUPPLIER_COST", publicPrice: "UNKNOWN", livePrice: false, orderCreated: false };
    }
    if (shippingCost == null || Number.isNaN(Number(shippingCost))) {
      return { ok: false, code: "MISSING_SHIPPING", publicPrice: "UNKNOWN", livePrice: false, orderCreated: false };
    }
    const vat = calculateVat({
      actorId: "nedim_bey",
      sellerCountry: "DE",
      customerCountry: country,
      deliveryCountry: country,
      goodsNet: price,
      kind: "B2C",
    });
    if (!vat.ok) return { ok: false, code: vat.code || "VAT_UNKNOWN", publicPrice: "UNKNOWN", livePrice: false, orderCreated: false };
    const offer = evaluateOffer({
      offerPrice: price,
      supplierCost: Number(supplierCost),
      shippingCost: Number(shippingCost),
      comparableMarketPrice: price + 5,
      categoryMargin: 0.05,
    });
    if (!offer.ok) {
      return { ok: false, code: offer.reasons[0] || "PRICE_REJECTED", reasons: offer.reasons, publicPrice: "UNKNOWN", livePrice: false, orderCreated: false, salesEnabled: false };
    }
    return {
      ok: true,
      code: "QUOTE_READ_ONLY",
      currency,
      net: vat.net,
      vat: vat.vat,
      gross: vat.gross,
      vatRate: vat.rate,
      shipping: Number(shippingCost),
      shippingVerified: false,
      discount: null,
      availability: "UNKNOWN",
      livePrice: false,
      liveLegal: false,
      salesEnabled: isSalesEnabled(),
      orderCreated: false,
    };
  }

  function placeOrder() {
    return { ok: false, code: "SALES_CLOSED", orderCreated: false, moneyMoved: false, salesEnabled: isSalesEnabled(), prototypeOrders: false };
  }

  function internalCosts(actorId) {
    if (!check(actorId, "PRICE_CALCULATE").ok) return { ok: false, code: "PERMISSION_DENIED", products: [] };
    const products = db.prepare(`SELECT id, supplier_cost FROM cat_products`).all();
    return { ok: true, products, live: false };
  }

  function serviceCard(id) {
    const card = detail(id);
    const serialized = JSON.stringify(card);
    return {
      ok: card.ok === true,
      card,
      leakedCost: serialized.includes("12.34") || serialized.includes("supplier_cost") || serialized.includes("supplierCost"),
      leakedPath: serialized.includes("buzzard.db"),
    };
  }

  function close() {
    db.close();
  }

  seed();
  return {
    path: resolved,
    insertProduct,
    categories,
    search,
    detail,
    quote,
    placeOrder,
    internalCosts,
    serviceCard,
    upper,
    formatNumber,
    formatMoney,
    locales: LOCALES,
    restoreRetired: () => restoreRetired(),
    close,
  };
}

module.exports = { openCatalog, upper, formatNumber, formatMoney, LOCALES };
