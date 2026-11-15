/** Mock supplier adapter for catalog-mode testing (P1-06). */

const MOCK_CATALOG = [
  {
    supplier_sku: "MOCK-001",
    ean_gtin: "5901234123457",
    brand: "MockBrand",
    manufacturer: "Mock Manufacturer GmbH",
    name: "Mock Bremsbelag Set Vorderachse",
    short_description: "Hochwertige Bremsbeläge für Testimport.",
    description: "Demo-Produkt aus Mock-Supplier. Kein echter Verkauf.",
    supplier_category: "automotive/brakes",
    supplier_price: { amount: 24.5, currency: "EUR" },
    stock: 42,
    attributes: { material: "Keramik", position: "Vorderachse" },
    vehicle_fitment: [{ brand: "VW", model: "Golf", year_from: 2012, year_to: 2020, engine: "1.4 TSI" }],
  },
  {
    supplier_sku: "MOCK-002",
    ean_gtin: "5901234123457",
    brand: "MockBrand",
    manufacturer: "Mock Manufacturer GmbH",
    name: "Mock Ölfilter 12345",
    short_description: "Ölfilter für Testkatalog.",
    description: "Demo-Produkt — Platzhalterbilder bleiben aktiv.",
    supplier_category: "automotive/filters",
    supplier_price: { amount: 8.9, currency: "EUR" },
    stock: 0,
    attributes: { thread: "M20x1.5" },
    vehicle_fitment: [{ brand: "BMW", model: "3er", year_from: 2015, year_to: 2022 }],
  },
];

const capabilities = ["catalog", "stock", "price", "order_prep", "xml"];

function closed(extra = {}) {
  return {
    ok: false,
    live: false,
    mock: true,
    status: "BLOCKED_EXTERNAL",
    code: "MOCK_NOT_COMMERCIAL",
    commercialEligibility: "BLOCKED",
    price: null,
    stock: null,
    supplierCost: null,
    purchased: false,
    reserved: false,
    ...extra,
  };
}

function fixtureRecord(row) {
  return {
    supplier_sku: row.supplier_sku,
    name: row.name,
    brand: row.brand,
    supplier_price: null,
    stock: null,
    currency: "UNKNOWN",
    fixturePrice: row.supplier_price,
    fixtureStock: row.stock,
    commercialUse: false,
    verified: false,
    mock: true,
  };
}

async function fetchCatalog(options = {}) {
  const limit = Math.min(Number(options.limit) || 50, MOCK_CATALOG.length);
  return closed({
    records: MOCK_CATALOG.slice(0, limit).map(fixtureRecord),
    total: MOCK_CATALOG.length,
    fetchedAt: null,
  });
}

async function fetchStock(options = {}) {
  const skus = options.skus || MOCK_CATALOG.map((r) => r.supplier_sku);
  const records = MOCK_CATALOG.filter((r) => skus.includes(r.supplier_sku)).map((r) => ({
    supplier_sku: r.supplier_sku,
    stock: null,
    fixtureStock: r.stock,
    updated_at: null,
    verified: false,
    commercialUse: false,
  }));
  return closed({ records });
}

async function fetchPrices(options = {}) {
  const skus = options.skus || MOCK_CATALOG.map((r) => r.supplier_sku);
  const records = MOCK_CATALOG.filter((r) => skus.includes(r.supplier_sku)).map((r) => ({
    supplier_sku: r.supplier_sku,
    supplier_price: null,
    fixturePrice: r.supplier_price,
    currency: "UNKNOWN",
    updated_at: null,
    verified: false,
    commercialUse: false,
  }));
  return closed({ records });
}

async function prepareOrder() {
  return {
    ok: false,
    mock: true,
    dryRun: true,
    sent: false,
    accepted: false,
    submitted: false,
    status: "BLOCKED_EXTERNAL",
    code: "SUPPLIER_NOT_LIVE",
    supplierOrderNumber: null,
    supplierResponse: null,
    message: "No supplier order is created from a local adapter call.",
  };
}

function parseXmlFeed(xmlText) {
  const records = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xmlText || ""))) {
    const block = match[1];
    const get = (tag) => {
      const found = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
      return found ? found[1].trim() : null;
    };
    const priceText = get("price");
    const stockText = get("stock");
    const currency = get("currency");
    records.push({
      supplier_sku: get("sku") || "UNKNOWN",
      name: get("name") || "UNKNOWN",
      supplier_price: null,
      fixturePrice: priceText == null || !Number.isFinite(Number(priceText)) ? null : Number(priceText),
      currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "UNKNOWN",
      stock: null,
      fixtureStock: stockText == null || !Number.isFinite(Number(stockText)) ? null : Number(stockText),
      brand: get("brand") || "UNKNOWN",
      commercialUse: false,
      verified: false,
    });
  }
  return closed({ records, format: "xml" });
}

module.exports = {
  name: "Mock Supplier Adapter",
  mock: true,
  capabilities,
  fetchCatalog,
  fetchStock,
  fetchPrices,
  prepareOrder,
  parseXmlFeed,
};
