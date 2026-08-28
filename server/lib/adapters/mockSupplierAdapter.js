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

async function fetchCatalog(options = {}) {
  const limit = Math.min(Number(options.limit) || 50, MOCK_CATALOG.length);
  return {
    ok: true,
    mock: true,
    records: MOCK_CATALOG.slice(0, limit),
    total: MOCK_CATALOG.length,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchStock(options = {}) {
  const skus = options.skus || MOCK_CATALOG.map((r) => r.supplier_sku);
  const records = MOCK_CATALOG.filter((r) => skus.includes(r.supplier_sku)).map((r) => ({
    supplier_sku: r.supplier_sku,
    stock: r.stock,
    updated_at: new Date().toISOString(),
  }));
  return { ok: true, mock: true, records };
}

async function fetchPrices(options = {}) {
  const skus = options.skus || MOCK_CATALOG.map((r) => r.supplier_sku);
  const records = MOCK_CATALOG.filter((r) => skus.includes(r.supplier_sku)).map((r) => ({
    supplier_sku: r.supplier_sku,
    supplier_price: r.supplier_price,
    updated_at: new Date().toISOString(),
  }));
  return { ok: true, mock: true, records };
}

async function prepareOrder(orderPayload, options = {}) {
  return {
    ok: true,
    mock: true,
    dryRun: options.dryRun !== false,
    status: "prepared_not_sent",
    supplierOrderNumber: `MOCK-PREP-${Date.now()}`,
    message: "Order preparation only — no real supplier dispatch (catalog mode).",
    payload: orderPayload,
  };
}

function parseXmlFeed(xmlText) {
  const records = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xmlText || ""))) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
      return m ? m[1].trim() : "";
    };
    records.push({
      supplier_sku: get("sku"),
      name: get("name"),
      supplier_price: { amount: Number(get("price")) || 0, currency: get("currency") || "EUR" },
      stock: Number(get("stock")) || 0,
      brand: get("brand"),
    });
  }
  return { ok: true, mock: true, records, format: "xml" };
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
