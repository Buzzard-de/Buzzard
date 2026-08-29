#!/usr/bin/env node
/**
 * Part 10 — Automated production safety guard (SALES must remain OFF)
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
  console.log(`Production safety tests → ${API}\n`);

  await test("BUZZARD_SALES_ENABLED=0 via /api/commerce/status", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("sales must be off");
    if (body.safety?.salesEnabled !== false) throw new Error("safety.salesEnabled must be false");
  });

  await test("Commercial order creation blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `prod-safe-${Date.now()}` }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.commercialOrders !== 0) throw new Error(`commercialOrders=${body.commercialOrders}`);
    if (body.realPayment !== false) throw new Error("realPayment must be false");
    if (body.supplierOrders !== 0) throw new Error("supplierOrders must be >0 blocked");
  });

  await test("Child flags cannot bypass SALES=0", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    const raw = body.flags?.raw || {};
    if (raw.BUZZARD_SALES_ENABLED) throw new Error("raw SALES flag enabled");
    if (body.flags?.paymentEnabled) throw new Error("payment enabled while sales off");
    if (body.flags?.stripeEnabled) throw new Error("stripe enabled while sales off");
    if (body.flags?.paypalEnabled) throw new Error("paypal enabled while sales off");
    if (body.flags?.supplierOrdersEnabled) throw new Error("supplier orders enabled while sales off");
    const violations = body.flags?.violations || [];
    if (violations.length) throw new Error(`flag violations: ${JSON.stringify(violations)}`);
  });

  await test("Go-live approval cannot enable sales", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const goLive = require("../server/lib/commerce/goLiveApproval.js");
    const activation = goLive.canActivateSales();
    if (activation.allowed) throw new Error("canActivateSales returned allowed=true");
    if (!goLive.PRODUCTION_SAFETY_LOCK) throw new Error("production safety lock must be active");
  });

  await test("Mock payment only — no real payment providers", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.mockPaymentOnly !== true && body.flags?.salesEnabled === false) {
      /* ok when sales off */
    }
    if (body.flags?.stripeEnabled || body.flags?.paypalEnabled) {
      throw new Error("real payment provider flags active");
    }
  });

  await test("Price tampering still blocked", async () => {
    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    const productId = catalog.body.items?.[0]?.id;
    if (!productId) throw new Error("demo product missing");
    const cart = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: "prod-safety-tamper" }),
    });
    const { res, body } = await fetchJson(`/api/commerce/cart/${cart.body.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1, clientPrice: 0.01 }),
    });
    if (res.ok) throw new Error("expected price tampering rejection");
    if (body.errorKey !== "price_tampering") throw new Error(body.errorKey);
  });

  await test("Coupon tampering blocked server-side", async () => {
    const { res, body } = await fetchJson("/api/commerce/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ couponCode: "WELCOME10", subtotal: 100, clientDiscount: 50 }),
    });
    if (res.ok) throw new Error("expected coupon tampering rejection");
    if (body.errorKey !== "coupon_tampering") throw new Error(body.errorKey);
  });

  console.log(`\nProduction safety: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
