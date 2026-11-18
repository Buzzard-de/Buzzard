// Phase 12: does the public catalog show unpublished products to anonymous callers?
const base = process.env.BUZZARD_API_URL;
const get = async (p, headers = {}) => { const r = await fetch(base + p, { headers }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, json: j }; };
for (const p of [
  "/api/catalog/products",
  "/api/catalog/products?preview=1",
  "/api/catalog/products/pim_prod_demo001",
  "/api/catalog/products/pim_prod_demo001?preview=1",
  "/api/catalog/products/slug/universal-demo-product?preview=1",
  "/api/catalog/search?q=demo",
  "/api/catalog/search?q=demo&preview=1",
  "/api/catalog/products/synthetic-shelf-item",
  "/api/catalog/products/slug/synthetic-shelf-item",
  "/api/admin/storefront/preview/products",
]) {
  const r = await get(p);
  const skus = r.json?.items ? r.json.items.map((i) => `${i.sku}[${Object.keys(i).filter((k) => /cost|supplier|margin|purchase|internal/i.test(k)).join("+")}]`).join(",") : r.json?.product ? `${r.json.product.sku} keys=${Object.keys(r.json.product).join("|")}` : JSON.stringify(r.json).slice(0, 120);
  console.log(r.status, p, "→", skus);
}
