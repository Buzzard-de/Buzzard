import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const legacyProducts = [
  { id: "bremsscheibe-280", name: "Bremsscheibe Vorderachse 280mm", brand: "ATE", category_id: "cat-05-03", price: 34.9, imageKey: "bremsen-disc", description: "Hochwertige Bremsscheibe für die Vorderachse. Durchmesser 280 mm, OEM-kompatibel.", stock: 24, sku: "BUZ-AUTO-000002", slug: "bremsscheibe-vorderachse-280mm", ean: "4006633001234" },
  { id: "bremsbelaege-vorder", name: "Bremsbeläge Satz Vorderachse", brand: "Bosch", category_id: "cat-05-03", price: 28.5, imageKey: "bremsen-pads", description: "Bremsbelag-Satz für die Vorderachse mit Verschleißanzeiger.", stock: 31, sku: "BUZ-AUTO-000003", slug: "bremsbelaege-satz-vorderachse", ean: "4006633001235" },
  { id: "motoroel-5w30", name: "Motoröl 5W-30 Fullsynthetic 5L", brand: "Castrol", category_id: "cat-05-01", price: 42.9, imageKey: "oel", description: "Vollsynthetisches Motoröl 5W-30 für Benzin- und Dieselmotoren.", stock: 50, sku: "BUZ-AUTO-000004", slug: "motoroel-5w30-fullsynthetic-5l", ean: "4006633001236" },
  { id: "oelfilter", name: "Ölfilter Universal OEM-kompatibel", brand: "MANN-FILTER", category_id: "cat-05-02", price: 8.9, imageKey: "filter-oil", description: "Universal Ölfilter mit hoher Filtrationsleistung.", stock: 80, sku: "BUZ-AUTO-000005", slug: "oelfilter-universal-oem", ean: "4006633001237" },
  { id: "innenraumfilter", name: "Innenraumfilter Pollenfilter Premium", brand: "MANN-FILTER", category_id: "cat-05-02", price: 12.5, imageKey: "filter-cabin", description: "Aktivkohle-Innenraumfilter für saubere Luft im Fahrzeug.", stock: 45, sku: "BUZ-AUTO-000006", slug: "innenraumfilter-pollenfilter-premium", ean: "4006633001238" },
  { id: "zuendkerze-ngk", name: "Zündkerze Iridium IX NGK", brand: "NGK", category_id: "cat-05-11", price: 9.9, imageKey: "zuendung", description: "Iridium-Zündkerze für optimale Zündung und lange Lebensdauer.", stock: 120, sku: "BUZ-AUTO-000007", slug: "zuendkerze-iridium-ix-ngk", ean: "4006633001239" },
  { id: "batterie-72ah", name: "Starterbatterie 12V 72Ah 680A", brand: "Varta", category_id: "cat-05-04", price: 89.9, imageKey: "batterie", description: "Starterbatterie 72Ah mit 680A Kaltstartstrom.", stock: 15, sku: "BUZ-AUTO-000008", slug: "starterbatterie-12v-72ah", ean: "4006633001240" },
  { id: "stossdaempfer", name: "Stoßdämpfer Vorderachse Gas", brand: "BILSTEIN", category_id: "cat-05-11", price: 64.9, imageKey: "fahrwerk", description: "Gasdruck-Stoßdämpfer für die Vorderachse.", stock: 12, sku: "BUZ-AUTO-000009", slug: "stossdaempfer-vorderachse-gas", ean: "4006633001241" },
  { id: "getriebeoel-75w90", name: "Getriebeöl 75W-90 Vollsynthetisch 1L", brand: "LIQUI MOLY", category_id: "cat-05-01", price: 18.9, imageKey: "oel-gear", description: "Vollsynthetisches Getriebeöl 75W-90 für Schaltgetriebe.", stock: 38, sku: "BUZ-AUTO-000010", slug: "getriebeoel-75w90-1l", ean: "4006633001242" },
  { id: "bremsfluessigkeit-dot4", name: "Bremsflüssigkeit DOT 4 500ml", brand: "ATE", category_id: "cat-05-03", price: 7.5, imageKey: "bremsen-fluid", description: "Bremsflüssigkeit DOT 4, 500 ml Flasche.", stock: 60, sku: "BUZ-AUTO-000011", slug: "bremsfluessigkeit-dot4-500ml", ean: "4006633001243" },
  { id: "keilrippenriemen", name: "Keilrippenriemen 6PK1548", brand: "Continental", category_id: "cat-05-11", price: 22.9, imageKey: "fahrwerk-belt", description: "Keilrippenriemen 6PK1548 für Nebenaggregate.", stock: 27, sku: "BUZ-AUTO-000012", slug: "keilrippenriemen-6pk1548", ean: "4006633001244" },
  { id: "frostschutz-g12", name: "Kühlerfrostschutzmittel G12+ 5L", brand: "LIQUI MOLY", category_id: "cat-05-01", price: 16.9, imageKey: "oel-coolant", description: "Frostschutzmittel G12+ für Kühlwasserkreislauf, 5 Liter.", stock: 33, sku: "BUZ-AUTO-000013", slug: "frostschutz-g12-plus-5l", ean: "4006633001245" },
  { id: "scheibenwischer-set", name: "Bosch Aerotwin Scheibenwischer Set", brand: "Bosch", category_id: "cat-05-07", price: 19.99, imageKey: "wischer", description: "Aerotwin Wischerblatt-Set für optimale Sicht bei Regen.", stock: 42, sku: "BUZ-AUTO-000014", slug: "bosch-aerotwin-scheibenwischer-set", ean: "4006633001246" },
  { id: "reifen-pilot-sport", name: "Michelin Pilot Sport 4 Reifen 225/45 R17", brand: "Michelin", category_id: "cat-05-05", price: 89.99, imageKey: "tire", description: "Sommerreifen Michelin Pilot Sport 4, 225/45 R17.", stock: 8, sku: "BUZ-AUTO-000015", slug: "michelin-pilot-sport-4-225-45-r17", ean: "4006633001247" },
];

function stockStatus(stock) {
  if (stock <= 0) return "out_of_stock";
  if (stock < 10) return "low_stock";
  return "in_stock";
}

function buildProduct(item, index) {
  const now = "2026-08-08T00:00:00.000Z";
  return {
    id: item.id,
    sku: item.sku,
    ean_gtin: item.ean,
    brand: item.brand,
    name: item.name,
    short_description: item.description.slice(0, 120),
    description: item.description,
    category_id: item.category_id,
    category_ids: [item.category_id, "cat-05"],
    images: [],
    documents: [],
    attributes: {
      image_key: item.imageKey,
      material: "OEM-kompatibel",
    },
    variants: [],
    price: { amount: item.price, currency: "EUR" },
    compare_at_price: item.price > 20 ? { amount: Math.round(item.price * 1.2 * 100) / 100, currency: "EUR" } : null,
    vat_rate: 19,
    stock: item.stock,
    stock_status: stockStatus(item.stock),
    supplier_id: "SUP-DEMO-001",
    supplier_sku: `SUP-${item.sku}`,
    supplier_price: { amount: Math.round(item.price * 0.62 * 100) / 100, currency: "EUR" },
    shipping: { weight_kg: 1.2, length_cm: 20, width_cm: 20, height_cm: 10, class: "standard" },
    seo: {
      slug: item.slug,
      title: `${item.name} | Buzzard`,
      description: `${item.name} bei Buzzard online kaufen. Schnelle Lieferung, faire Preise.`,
    },
    status: "active",
    buy_now_enabled: true,
    created_at: now,
    updated_at: now,
  };
}

const testProduct = {
  id: "prod-000001",
  sku: "BUZ-AUTO-000001",
  ean_gtin: "4006633001001",
  brand: "Buzzard Premium",
  name: "Premium Bremsscheibe Testprodukt",
  short_description: "Testprodukt für Package 02 – Premium Bremsscheibe mit Varianten.",
  description:
    "Dieses Testprodukt validiert die Buzzard-Produktarchitektur: Varianten, SEO-URL, Lagerstatus, technische Attribute und Warenkorb-Integration. Hochwertige Bremsscheibe für die Vorderachse mit korrosionsbeständiger Beschichtung.",
  category_id: "cat-05-03",
  category_ids: ["cat-05-03", "cat-05"],
  images: [],
  documents: [
    { title: "Produktdatenblatt (PDF)", url: "/documents/buzzard-test-bremsscheibe.pdf" },
  ],
  attributes: {
    image_key: "bremsen-disc",
    durchmesser: "280 mm",
    material: "Gusseisen verzinkt",
    achse: "Vorderachse",
    oem_referenz: "Compatible OEM",
  },
  variants: [
    { id: "var-size-280", type: "size", label: "Durchmesser", value: "280 mm", sku: "BUZ-AUTO-000001-280", price: { amount: 34.9, currency: "EUR" }, stock: 24, stock_status: "in_stock" },
    { id: "var-size-300", type: "size", label: "Durchmesser", value: "300 mm", sku: "BUZ-AUTO-000001-300", price: { amount: 39.9, currency: "EUR" }, stock: 12, stock_status: "in_stock" },
    { id: "var-color-silver", type: "color", label: "Oberfläche", value: "Silber", sku: "BUZ-AUTO-000001-SLV", stock: 20, stock_status: "in_stock" },
    { id: "var-color-black", type: "color", label: "Oberfläche", value: "Schwarz lackiert", sku: "BUZ-AUTO-000001-BLK", stock: 8, stock_status: "low_stock" },
    { id: "var-vehicle-vw", type: "vehicle", label: "Fahrzeug", value: "VW Golf VII 1.6 TDI", sku: "BUZ-AUTO-000001-VW", stock: 10, stock_status: "in_stock" },
  ],
  price: { amount: 34.9, currency: "EUR" },
  compare_at_price: { amount: 44.9, currency: "EUR" },
  vat_rate: 19,
  stock: 44,
  stock_status: "in_stock",
  supplier_id: "SUP-INTERNAL-001",
  supplier_sku: "WH-BRAKE-280-PREM",
  supplier_price: { amount: 21.5, currency: "EUR" },
  shipping: { weight_kg: 3.4, length_cm: 30, width_cm: 30, height_cm: 8, class: "standard" },
  seo: {
    slug: "premium-bremsscheibe-testprodukt",
    title: "Premium Bremsscheibe Testprodukt | Buzzard",
    description: "Buzzard Testprodukt – Premium Bremsscheibe mit Varianten, SEO und Warenkorb-Integration.",
  },
  status: "active",
  buy_now_enabled: true,
  created_at: "2026-08-08T00:00:00.000Z",
  updated_at: "2026-08-08T00:00:00.000Z",
};

const catalog = {
  project: "Buzzard",
  document: "Product Catalog Master",
  version: "1.0.0",
  products: [testProduct, ...legacyProducts.map(buildProduct)],
};

fs.writeFileSync(
  path.join(root, "data/buzzard_products.json"),
  JSON.stringify(catalog, null, 2)
);
console.log("Generated", catalog.products.length, "products");
