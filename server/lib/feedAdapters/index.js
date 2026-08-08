const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..", "..");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de";

function loadProducts() {
  const doc = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  return (doc.products || []).filter((p) => p.status === "active");
}

function availability(product) {
  if (product.stock_status === "out_of_stock" || product.stock <= 0) return "out of stock";
  if (product.stock_status === "preorder") return "preorder";
  return "in stock";
}

function googleMerchantRows() {
  return loadProducts().map((product) => ({
    id: product.id,
    title: product.seo?.title || product.name,
    description: product.short_description || product.description,
    link: `${SITE_URL}/produkt/${product.seo.slug.replace(/^\/+|\/+$/g, "")}/`,
    image_link: product.images?.[0] || `${SITE_URL}/logo/logo.png`,
    price: `${product.price.amount.toFixed(2)} EUR`,
    availability: availability(product),
    brand: product.brand,
    gtin: product.ean_gtin || "",
    condition: "new",
    google_product_category: product.category_id,
    mpn: product.sku,
  }));
}

function ebayRows() {
  return googleMerchantRows().map((row) => ({
    sku: row.mpn,
    title: row.title,
    description: row.description,
    price: row.price.replace(" EUR", ""),
    quantity: loadProducts().find((p) => p.id === row.id)?.stock || 0,
    picture_url: row.image_link,
    product_url: row.link,
  }));
}

function amazonRows() {
  return googleMerchantRows().map((row) => ({
    sku: row.mpn,
    product_name: row.title,
    product_description: row.description,
    standard_price: row.price.replace(" EUR", ""),
    quantity: loadProducts().find((p) => p.id === row.id)?.stock || 0,
    main_image_url: row.image_link,
    brand_name: row.brand,
    external_product_id: row.gtin,
    external_product_id_type: row.gtin ? "EAN" : "",
  }));
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join("\t")];
  for (const row of rows) {
    lines.push(headers.map((h) => String(row[h] ?? "").replace(/\t/g, " ")).join("\t"));
  }
  return lines.join("\n");
}

module.exports = {
  googleMerchantRows,
  ebayRows,
  amazonRows,
  toCsv,
};
