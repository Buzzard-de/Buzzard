#!/usr/bin/env node
/**
 * Part 8 — Commerce readiness smoke tests (CRITICAL: sales must stay disabled)
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
  console.log(`Part 8 smoke tests → ${API}\n`);

  let adminToken = null;

  await test("GET /api/health/commerce", async () => {
    const { res, body } = await fetchJson("/api/health/commerce");
    if (!res.ok || !body.health?.enabled === undefined) throw new Error(`status ${res.status}`);
    if (body.health.sales?.salesEnabled !== false) throw new Error("sales must be disabled");
  });

  await test("GET /api/commerce/status — sales blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/status");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.flags?.salesEnabled !== false) throw new Error("salesEnabled must be false");
  });

  await test("GET /api/commerce/readiness", async () => {
    const { res, body } = await fetchJson("/api/commerce/readiness");
    if (!res.ok || !body.readiness?.checks?.length) throw new Error(`status ${res.status}`);
    if (body.readiness.salesBlocked !== true) throw new Error("salesBlocked must be true");
  });

  await test("POST /api/commerce/cart + add demo item", async () => {
    const { res: cRes, body: cBody } = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ country: "DE", sessionId: "part8-smoke" }),
    });
    if (!cRes.ok || !cBody.cart?.id) throw new Error("cart create failed");

    const { res, body } = await fetchJson("/api/commerce/cart/products", { method: "GET" }).catch(() => ({ res: { ok: false }, body: {} }));
    void res;

    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    const productId = catalog.body.items?.[0]?.id;
    if (!productId) throw new Error("demo product not in catalog");

    const { res: addRes, body: addBody } = await fetchJson(`/api/commerce/cart/${cBody.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (!addRes.ok) throw new Error(`add item failed: ${addBody.errorKey || addRes.status}`);
    if (addBody.items?.[0]?.priceSnapshot <= 0) throw new Error("server price must be authoritative");
  });

  await test("Dry-run checkout flow (DRY_RUN)", async () => {
    const { body: cBody } = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: "part8-dry" }),
    });
    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    const productId = catalog.body.items?.[0]?.id;
    await fetchJson(`/api/commerce/cart/${cBody.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    const { body: chk } = await fetchJson("/api/commerce/checkout/start", {
      method: "POST",
      body: JSON.stringify({ cartId: cBody.cart.id, orderType: "DRY_RUN" }),
    });
    if (!chk.checkout?.id) throw new Error("checkout start failed");

    const addr = { line1: "Test 1", city: "Berlin", postalCode: "10115", country: "DE" };
    const { res: vRes, body: vBody } = await fetchJson(`/api/commerce/checkout/${chk.checkout.id}/validate`, {
      method: "POST",
      body: JSON.stringify({ billingAddress: addr, shippingAddress: addr }),
    });
    if (!vRes.ok || vBody.state !== "READY") throw new Error(`validate failed: ${vBody.errorKey}`);

    const { res: compRes, body: compBody } = await fetchJson(`/api/commerce/checkout/${chk.checkout.id}/complete`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: `dry-${Date.now()}` }),
    });
    if (!compRes.ok) throw new Error(`complete failed: ${compBody.errorKey}`);
    if (compBody.order?.orderType !== "DRY_RUN") throw new Error("expected DRY_RUN order");
    if (compBody.payment?.realMoneyMovement !== false) throw new Error("no real payment");
  });

  await test("CRITICAL: commercial checkout attempt blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `critical-${Date.now()}` }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.commercialOrders !== 0) throw new Error(`REAL ORDER created: ${body.commercialOrders}`);
    if (body.salesEnabled !== false) throw new Error("SALES must be disabled");
    if (body.realPayment !== false) throw new Error("real payment must be false");
    if (body.supplierOrders !== 0) throw new Error("supplier orders must be 0");
  });

  await test("Price tampering rejected", async () => {
    const { body: cBody } = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: "part8-tamper" }),
    });
    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    const productId = catalog.body.items?.[0]?.id;
    const { res, body } = await fetchJson(`/api/commerce/cart/${cBody.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1, clientPrice: 0.01 }),
    });
    if (res.ok) throw new Error("expected price tampering rejection");
    if (body.errorKey !== "price_tampering") throw new Error(`expected price_tampering got ${body.errorKey}`);
  });

  await test("Payment webhook blocked when sales disabled", async () => {
    const { res, body } = await fetchJson("/api/commerce/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "payment_intent.succeeded", id: "evt_test" }),
      headers: { "X-Event-Id": `wh-${Date.now()}`, "X-Signature": "invalid" },
    });
    if (body.orderCreated !== false && body.paymentCreated !== false && res.status !== 403 && res.status !== 401) {
      throw new Error("webhook should not create orders");
    }
  });

  await test("Admin login for commerce overview", async () => {
    const login = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@buzzard.de", password: "BuzzardAdmin2026!" }),
    });
    adminToken = login.body.token;
    if (!adminToken) throw new Error("admin login failed");
  });

  await test("GET /api/admin/commerce/overview", async () => {
    const { res, body } = await fetchJson("/api/admin/commerce/overview", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok || !body.readiness) throw new Error(`status ${res.status}`);
    if (body.flags?.salesEnabled !== false) throw new Error("sales must stay off");
  });

  await test("Legacy PIM migration dry-run", async () => {
    const { res, body } = await fetchJson("/api/admin/commerce/migration/legacy-pim", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok || body.report?.dryRun !== true) throw new Error("dry-run report expected");
    if (body.report.destructive !== false) throw new Error("must not be destructive");
  });

  await test("BUZZARD_SALES_ENABLED remains off", async () => {
    const { body } = await fetchJson("/api/admin/control-center/config", {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(async () => {
      const status = await fetchJson("/api/commerce/status");
      return status;
    });
    const sales = body.config?.find?.((c) => c.key === "BUZZARD_SALES_ENABLED")?.value;
    const envSales = (await fetchJson("/api/commerce/status")).body.flags?.raw?.BUZZARD_SALES_ENABLED;
    if (envSales === true) throw new Error("BUZZARD_SALES_ENABLED must be 0");
    if (sales === "1") throw new Error("config sales enabled");
  });

  console.log(`\nPart 8: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
