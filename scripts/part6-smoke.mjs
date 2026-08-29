#!/usr/bin/env node
/**
 * Part 6 — Product Core + PIM foundation smoke tests
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
  console.log(`Part 6 smoke tests → ${API}\n`);

  let token = null;

  await test("Admin login", async () => {
    const { res, body } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@buzzard.de", password: "BuzzardAdmin2026!" }),
    });
    if (!res.ok || !body.token) throw new Error(`status ${res.status}`);
    token = body.token;
  });

  if (!token) {
    console.log(`\nPart 6: ${passed} passed, ${failed} failed (no token)`);
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${token}` };

  await test("GET /api/admin/pim-core/products", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/products", { headers: auth });
    if (!res.ok || !Array.isArray(body.products)) throw new Error(`status ${res.status}`);
    if (!body.products.some((p) => p.sku === "BZ-CORE-DEMO-001")) throw new Error("demo product missing");
  });

  await test("GET demo product detail + audit", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/products/pim_prod_demo001", { headers: auth });
    if (!res.ok || !body.product?.id) throw new Error(`status ${res.status}`);
    if (body.product.category !== "cat-05") throw new Error(`expected cat-05, got ${body.product.category}`);
  });

  await test("POST validate product", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/products/pim_prod_demo001/validate", {
      method: "POST",
      headers: auth,
      body: "{}",
    });
    if (!res.ok || !body.validation?.overall) throw new Error(`status ${res.status}`);
  });

  await test("GET brands", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/brands", { headers: auth });
    if (!res.ok || !body.brands?.length) throw new Error(`status ${res.status}`);
  });

  await test("GET category attribute schema", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/categories/cat-05/schema", { headers: auth });
    if (!res.ok || !body.schema?.attributes?.length) throw new Error(`status ${res.status}`);
  });

  await test("GET category mapping", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/categories/cat-05/mapping", { headers: auth });
    if (!res.ok || !body.mapping?.exists) throw new Error(`status ${res.status}`);
  });

  await test("POST import dry-run", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/import", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        dryRun: true,
        raw: { sku: "BZ-SMOKE-DRY", title: "Smoke Dry", ean: "4006381333933", category: "cat-05" },
      }),
    });
    if (!res.ok || body.dryRun !== true) throw new Error(`status ${res.status}`);
    if (!body.stages?.length) throw new Error("missing stages");
  });

  await test("GET search", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/search?q=BZ-CORE", { headers: auth });
    if (!res.ok || !Array.isArray(body.results)) throw new Error(`status ${res.status}`);
  });

  await test("GET quality score", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/quality/pim_prod_demo001", { headers: auth });
    if (!res.ok || body.quality?.score === undefined) throw new Error(`status ${res.status}`);
  });

  await test("GET AI capabilities", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/ai/capabilities", { headers: auth });
    if (!res.ok || !body.capabilities?.includes("title_generation")) throw new Error(`status ${res.status}`);
  });

  await test("POST enqueue PRODUCT_IMPORT job", async () => {
    const { res, body } = await fetchJson("/api/admin/pim-core/import/enqueue", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ dryRun: true, raw: { sku: "BZ-JOB-DRY", title: "Job Dry" } }),
    });
    if (res.status !== 201 || !body.job?.id) throw new Error(`status ${res.status}`);
  });

  await test("Automation overview includes PIM job types", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/overview", { headers: auth });
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.jobTypes?.includes("PRODUCT_IMPORT")) throw new Error("missing PRODUCT_IMPORT");
    if (!body.jobTypes?.includes("PRODUCT_VALIDATE")) throw new Error("missing PRODUCT_VALIDATE");
  });

  await test("BUZZARD_SALES_ENABLED remains off", async () => {
    const { res, body } = await fetchJson("/api/admin/control-center/config", { headers: auth });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const sales = body.config?.BUZZARD_SALES_ENABLED ?? body.config?.sales_enabled;
    if (sales === "1" || sales === 1) throw new Error("sales enabled");
  });

  console.log(`\nPart 6: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
