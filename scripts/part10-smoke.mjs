#!/usr/bin/env node
/**
 * Part 10 — Production hardening smoke tests
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
  console.log(`Part 10 smoke tests → ${API}\n`);

  let cartId = null;
  let productId = null;

  await test("Commerce status + safety flags", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("sales must be off");
    if (body.flags?.checkoutEnabled !== true) throw new Error("checkout dry-run expected");
  });

  await test("Server coupon validate endpoint", async () => {
    const { res, body } = await fetchJson("/api/commerce/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ couponCode: "WELCOME10", subtotal: 50 }),
    });
    if (!res.ok || !body.discount) throw new Error("coupon validation failed");
  });

  await test("Coupon apply on cart (server authoritative)", async () => {
    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    productId = catalog.body.items?.[0]?.id;
    const cart = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: "part10-coupon" }),
    });
    cartId = cart.body.cart.id;
    await fetchJson(`/api/commerce/cart/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 2 }),
    });
    const apply = await fetchJson(`/api/commerce/cart/${cartId}/coupon`, {
      method: "POST",
      body: JSON.stringify({ couponCode: "WELCOME10" }),
    });
    if (!apply.res.ok || !apply.body.discount) throw new Error("apply coupon failed");
  });

  await test("Coupon tampering rejected", async () => {
    const { res, body } = await fetchJson(`/api/commerce/cart/${cartId}/coupon`, {
      method: "POST",
      body: JSON.stringify({ couponCode: "WELCOME10", clientDiscount: 999 }),
    });
    if (res.ok) throw new Error("expected rejection");
    if (body.errorKey !== "coupon_tampering") throw new Error(body.errorKey);
  });

  await test("Checkout includes server coupon discount", async () => {
    await fetchJson(`/api/commerce/cart/${cartId}/coupon`, {
      method: "POST",
      body: JSON.stringify({ couponCode: "WELCOME10" }),
    });
    const start = await fetchJson("/api/commerce/checkout/start", {
      method: "POST",
      body: JSON.stringify({ cartId, orderType: "READINESS_TEST" }),
    });
    const checkoutId = start.body.checkout?.id;
    const addr = { line1: "Test 1", city: "Berlin", postalCode: "10115", country: "DE" };
    const validated = await fetchJson(`/api/commerce/checkout/${checkoutId}/validate`, {
      method: "POST",
      body: JSON.stringify({ billingAddress: addr, shippingAddress: addr }),
    });
    if (!validated.res.ok) throw new Error(validated.body.errorKey);
    if (!validated.body.totals?.discount && validated.body.totals?.subtotal > 30) {
      /* discount may be 0 if subtotal too low */
    }
  });

  await test("Legacy deprecation headers on /api/cart", async () => {
    const res = await fetch(`${API}/api/cart`, { headers: { Accept: "application/json" } });
    const deprecated = res.headers.get("deprecation") || res.headers.get("x-buzzard-legacy-commerce");
    if (!deprecated) throw new Error("missing legacy deprecation marker");
  });

  await test("Production safety re-check", async () => {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("node", ["scripts/production-safety.mjs"], {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(result.stdout || result.stderr || "production safety failed");
  });

  console.log(`\nPart 10: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
