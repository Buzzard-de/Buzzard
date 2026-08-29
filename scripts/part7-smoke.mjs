#!/usr/bin/env node
/**
 * Part 7 — Storefront bridge smoke tests
 */
const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`✗ ${name} — ${err.message}`);
    failed += 1;
  }
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log(`Part 7 smoke tests → ${API}\n`);

  let token = null;

  await test("GET /api/catalog/health (public)", async () => {
    const { res, body } = await fetchJson("/api/catalog/health");
    if (!res.ok || body.health?.enabled === undefined) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/catalog/products (public pagination)", async () => {
    const { res, body } = await fetchJson("/api/catalog/products?page=1&limit=12");
    if (!res.ok || !Array.isArray(body.items)) throw new Error(`status ${res.status}`);
    if (body.catalogMode !== true) throw new Error("expected catalogMode true");
  });

  await test("GET /api/catalog/products includes PIM demo", async () => {
    const { res, body } = await fetchJson("/api/catalog/products?q=BZ-CORE");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.items?.some((p) => p.sku === "BZ-CORE-DEMO-001")) throw new Error("demo product missing");
  });

  await test("GET /api/catalog/products/slug/:slug", async () => {
    const { res, body } = await fetchJson("/api/catalog/products/slug/universal-demo-product");
    if (!res.ok || !body.product?.id) throw new Error(`status ${res.status}`);
    if (body.product.buyNowEnabled !== false) throw new Error("buyNow must be false");
  });

  await test("GET /api/catalog/categories", async () => {
    const { res, body } = await fetchJson("/api/catalog/categories");
    if (!res.ok || !body.categories?.length) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/catalog/brands", async () => {
    const { res, body } = await fetchJson("/api/catalog/brands");
    if (!res.ok || !Array.isArray(body.brands)) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/catalog/search", async () => {
    const { res, body } = await fetchJson("/api/catalog/search?q=Demo&limit=5");
    if (!res.ok || !Array.isArray(body.items)) throw new Error(`status ${res.status}`);
  });

  await test("Public API excludes admin fields", async () => {
    const { res, body } = await fetchJson("/api/catalog/products?q=BZ-CORE");
    const item = body.items?.[0];
    if (!item) throw new Error("no item");
    if (item.supplier || item.supplierId || item.metadata?.internal) throw new Error("admin leak");
  });

  await test("Admin login", async () => {
    const { res, body } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@buzzard.de", password: "BuzzardAdmin2026!" }),
    });
    if (!res.ok || !body.token) throw new Error(`status ${res.status}`);
    token = body.token;
  });

  if (token) {
    const auth = { Authorization: `Bearer ${token}` };

    await test("GET /api/admin/storefront/health", async () => {
      const { res, body } = await fetchJson("/api/admin/storefront/health", { headers: auth });
      if (!res.ok || body.health?.productCount === undefined) throw new Error(`status ${res.status}`);
    });

    await test("GET /api/admin/storefront/preview/products", async () => {
      const { res, body } = await fetchJson("/api/admin/storefront/preview/products", { headers: auth });
      if (!res.ok || body.preview !== true) throw new Error(`status ${res.status}`);
    });

    await test("POST /api/admin/storefront/sync dry-run", async () => {
      const { res, body } = await fetchJson("/api/admin/storefront/sync", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ dryRun: true }),
      });
      if (!res.ok || body.dryRun !== true) throw new Error(`status ${res.status}`);
    });

    await test("Control Center includes STOREFRONT_CATALOG", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/status", { headers: auth });
      if (!res.ok || !body.services?.STOREFRONT_CATALOG) throw new Error("missing storefront service");
    });
  }

  await test("BUZZARD_SALES_ENABLED remains off", async () => {
    const { res, body } = await fetchJson("/api/admin/control-center/config", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (token && !res.ok) throw new Error(`status ${res.status}`);
    if (token) {
      const sales = body.config?.BUZZARD_SALES_ENABLED ?? body.config?.sales_enabled;
      if (sales === "1" || sales === 1) throw new Error("sales enabled");
    }
  });

  console.log(`\nPart 7: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
