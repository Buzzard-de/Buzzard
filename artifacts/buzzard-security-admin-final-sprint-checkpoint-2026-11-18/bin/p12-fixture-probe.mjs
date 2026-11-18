// Phase 12: what the public catalog says about the synthetic shelf item.
const base = process.env.BUZZARD_API_URL;
const get = async (p) => { const r = await fetch(base + p); let j = null; try { j = await r.json(); } catch {} return { status: r.status, json: j }; };
const list = await get("/api/catalog/products");
console.log("list", list.status, "total", list.json?.total, "catalogMode", list.json?.catalogMode);
for (const item of list.json?.items || []) console.log(JSON.stringify(item));
const item = (list.json?.items || []).find((i) => i.sku === "BZ-E2E-VISIBLE-001");
if (item) {
  const slug = String(item.seo?.slug || "").replace(/^\/+|\/+$/g, "");
  for (const p of [`/api/catalog/products/${item.id}`, `/api/catalog/products/slug/${slug}`, `/api/catalog/search?q=Synthetic`, `/api/catalog/search?q=BZ-E2E-VISIBLE-001`, `/api/catalog/products?q=shelf`, `/api/catalog/products/pim_prod_demo001`, `/api/catalog/products/slug/universal-demo-product`, `/api/catalog/products?q=BZ-CORE-DEMO-001`]) {
    const r = await get(p);
    console.log(p, r.status, r.json?.total ?? "", r.json?.product ? JSON.stringify(r.json.product).slice(0, 600) : (r.json?.items || []).map((i) => i.sku).join(","));
  }
}
for (const p of ["/api/catalog/categories", "/api/catalog/merchant-feed", "/api/catalog/sitemap", "/api/catalog/readiness", "/api/storefront/health"]) {
  const r = await get(p);
  console.log(p, r.status, JSON.stringify(r.json).slice(0, 300));
}
