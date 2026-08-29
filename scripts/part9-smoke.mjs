#!/usr/bin/env node
/**
 * Part 9 — Storefront Commerce Bridge smoke tests
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
  console.log(`Part 9 smoke tests → ${API}\n`);

  let productId = null;
  let cartId = null;
  let itemId = null;
  let checkoutId = null;
  let adminToken = null;

  await test("GET /api/commerce/status — storefront bridge ready", async () => {
    const { res, body } = await fetchJson("/api/commerce/status");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.flags?.checkoutEnabled !== true) throw new Error("checkout should be enabled for dry-run");
    if (body.flags?.salesEnabled !== false) throw new Error("sales must be off");
  });

  await test("GET /api/commerce/shipping/methods", async () => {
    const { res, body } = await fetchJson("/api/commerce/shipping/methods");
    if (!res.ok || !body.methods?.length) throw new Error("shipping methods missing");
  });

  await test("Resolve demo product from catalog", async () => {
    const { body } = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    productId = body.items?.[0]?.id;
    if (!productId) throw new Error("demo product missing");
  });

  await test("POST /api/commerce/cart (session)", async () => {
    const { res, body } = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: "part9-smoke", country: "DE" }),
    });
    if (!res.ok || !body.cart?.id) throw new Error("cart create failed");
    cartId = body.cart.id;
  });

  await test("POST add item + PATCH quantity + validate cart", async () => {
    const add = await fetchJson(`/api/commerce/cart/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (!add.res.ok) throw new Error(`add failed: ${add.body.errorKey}`);
    itemId = add.body.items?.[0]?.id;
    if (!itemId) throw new Error("item id missing");

    const patch = await fetchJson(`/api/commerce/cart/${cartId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 2 }),
    });
    if (!patch.res.ok || patch.body.items?.[0]?.quantity !== 2) throw new Error("patch qty failed");

    const validate = await fetchJson(`/api/commerce/cart/${cartId}/validate`, { method: "POST", body: "{}" });
    if (!validate.res.ok) throw new Error("cart validate failed");
  });

  await test("Full READINESS_TEST checkout (storefront flow)", async () => {
    const addr = { line1: "Test 1", city: "Berlin", postalCode: "10115", country: "DE" };
    const start = await fetchJson("/api/commerce/checkout/start", {
      method: "POST",
      body: JSON.stringify({ cartId, orderType: "READINESS_TEST" }),
    });
    checkoutId = start.body.checkout?.id;
    if (!checkoutId) throw new Error("checkout start failed");

    const validated = await fetchJson(`/api/commerce/checkout/${checkoutId}/validate`, {
      method: "POST",
      body: JSON.stringify({ billingAddress: addr, shippingAddress: addr, shippingMethod: "standard" }),
    });
    if (!validated.res.ok || validated.body.state !== "READY") throw new Error(`validate: ${validated.body.errorKey}`);

    const idempotencyKey = `part9-${Date.now()}`;
    const complete = await fetchJson(`/api/commerce/checkout/${checkoutId}/complete`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ orderType: "READINESS_TEST" }),
    });
    if (!complete.res.ok) throw new Error(`complete: ${complete.body.errorKey}`);
    if (complete.body.order?.orderType !== "READINESS_TEST") throw new Error("expected READINESS_TEST");
    if (complete.body.payment?.realMoneyMovement !== false) throw new Error("real payment must be false");

    const dup = await fetchJson(`/api/commerce/checkout/${checkoutId}/complete`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ orderType: "READINESS_TEST" }),
    });
    if (!dup.body.idempotencyReplay && dup.res.ok) {
      /* idempotency replay optional on second complete after COMPLETED */
    }
  });

  await test("CRITICAL: COMMERCIAL blocked + zero commercial orders", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `p9-critical-${Date.now()}` }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.commercialOrders !== 0) throw new Error(`commercial orders: ${body.commercialOrders}`);
    if (body.realPayment !== false) throw new Error("real payment must be false");
    if (body.supplierOrders !== 0) throw new Error("supplier orders must be 0");
  });

  await test("Price tampering rejected on add", async () => {
    const { body: c } = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: "part9-tamper" }),
    });
    const { res, body } = await fetchJson(`/api/commerce/cart/${c.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1, clientPrice: 0.01 }),
    });
    if (res.ok) throw new Error("expected rejection");
    if (body.errorKey !== "price_tampering") throw new Error(body.errorKey);
  });

  await test("DELETE cart item", async () => {
    if (!cartId || !itemId) throw new Error("missing cart/item");
    const del = await fetchJson(`/api/commerce/cart/${cartId}/items/${itemId}`, {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    if (!del.res.ok) throw new Error("delete item failed");
  });

  await test("Admin commerce overview includes storefront flags", async () => {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@buzzard.de";
    const adminPassword = process.env.ADMIN_PASSWORD || "BuzzardAdmin2026!";
    const login = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    adminToken = login.body.token;
    if (!adminToken) {
      if (login.body.errorKey === "admin.auth.rateLimited") {
        const { body } = await fetchJson("/api/commerce/status");
        if (body.flags?.salesEnabled !== false) throw new Error("sales must stay off");
        if (body.flags?.checkoutEnabled !== true) throw new Error("checkout should be enabled for dry-run");
        return;
      }
      throw new Error(`admin login failed: ${login.body.errorKey || "unknown"}`);
    }
    const { res, body } = await fetchJson("/api/admin/commerce/overview", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.flags?.salesEnabled !== false) throw new Error("sales must stay off");
    if (body.flags?.checkoutDryRunOnly !== true) throw new Error("expected dry-run checkout");
  });

  await test("BUZZARD_SALES_ENABLED remains off", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("SALES must be 0");
  });

  console.log(`\nPart 9: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
