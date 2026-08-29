#!/usr/bin/env node
/**
 * Part 11 — Final integration audit (cross-system production safety)
 * Does NOT enable sales. Verifies actual API behavior.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

let passed = 0;
let failed = 0;
let skipped = 0;
const findings = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    if (err.skip) {
      console.log(`○ ${name} — ${err.message}`);
      skipped += 1;
    } else {
      console.log(`✗ ${name} — ${err.message}`);
      failed += 1;
      findings.push({ name, error: err.message });
    }
  }
}

function skip(msg) {
  const e = new Error(msg);
  e.skip = true;
  throw e;
}

async function fetchJson(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
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
  console.log(`Final audit → ${API}\n`);

  // --- Commerce safety ---
  await test("SALES=0 enforced", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("sales enabled");
  });

  await test("Commercial checkout attempt blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `audit-${Date.now()}` }),
    });
    if (res.status === 429) skip("rate limited");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.commercialOrders !== 0) throw new Error(`commercialOrders=${body.commercialOrders}`);
    if (body.realPayment !== false) throw new Error("real payment");
    if (body.supplierOrders !== 0) throw new Error("supplier orders");
  });

  await test("Go-live lock active", async () => {
    const goLive = require("../server/lib/commerce/goLiveApproval.js");
    const activation = goLive.canActivateSales();
    if (activation.allowed) throw new Error("canActivateSales allowed");
    if (!goLive.PRODUCTION_SAFETY_LOCK) throw new Error("safety lock off");
  });

  await test("Payment providers disabled (Stripe/PayPal flags)", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.stripeEnabled || body.flags?.paypalEnabled) {
      throw new Error("payment provider enabled while sales off");
    }
  });

  await test("Commerce supplier order stub blocked", async () => {
    const orderService = require("../server/lib/commerce/orderService.js");
    const result = orderService.submitSupplierOrder({ orderId: "audit_test" });
    const blocked =
      result.status === 403 &&
      (result.blocked === true || result.error === "supplier_order_blocked" || result.code === "supplier_order_disabled");
    if (!blocked) throw new Error(`supplier order not blocked: ${JSON.stringify(result)}`);
  });

  // --- Tampering ---
  await test("Price tampering rejected", async () => {
    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    const productId = catalog.body.items?.[0]?.id;
    if (!productId) throw new Error("demo product missing");
    const cart = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: `audit-tamper-${Date.now()}` }),
    });
    const { res, body } = await fetchJson(`/api/commerce/cart/${cart.body.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1, clientPrice: 0.01 }),
    });
    if (res.ok) throw new Error("expected rejection");
    if (body.errorKey !== "price_tampering") throw new Error(body.errorKey);
  });

  await test("Coupon tampering rejected", async () => {
    const { res, body } = await fetchJson("/api/commerce/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ couponCode: "WELCOME10", subtotal: 100, clientDiscount: 99 }),
    });
    if (res.ok) throw new Error("expected rejection");
    if (body.errorKey !== "coupon_tampering") throw new Error(body.errorKey);
  });

  // --- IDOR ---
  await test("IDOR cart access denied", async () => {
    const cartA = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: `audit-idor-${Date.now()}`, customerId: "cust_audit_a" }),
    });
    if (!cartA.body.cart?.id) throw new Error("cart create failed");
    const foreign = await fetchJson(
      `/api/commerce/cart/${cartA.body.cart.id}?customerId=cust_audit_b`
    );
    if (![403, 404].includes(foreign.res.status)) {
      throw new Error(`expected 403/404 got ${foreign.res.status}`);
    }
  });

  // --- Auth / RBAC structure ---
  await test("Admin route requires auth", async () => {
    const { res } = await fetchJson("/api/admin/control-center/status");
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`expected 401/403 got ${res.status}`);
    }
  });

  await test("Unified auth facade exists", async () => {
    const authFacade = require("../server/core/auth/index.js");
    if (typeof authFacade.requireAuth !== "function") throw new Error("missing requireAuth");
    if (typeof authFacade.requirePermission !== "function") throw new Error("missing requirePermission");
  });

  // --- Legacy deprecation ---
  await test("Legacy cart has deprecation header", async () => {
    const res = await fetch(`${API}/api/cart`, { headers: { Accept: "application/json" } });
    const legacy = res.headers.get("x-buzzard-legacy-commerce");
    if (!legacy) throw new Error("missing legacy header");
  });

  // --- Catalog / PIM ---
  await test("Catalog health reachable", async () => {
    const { res } = await fetchJson("/api/catalog/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await test("53 shop L1 categories in data", async () => {
    const data = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/buzzard_categories.json"), "utf8")
    );
    if (data.categories?.length !== 53) {
      throw new Error(`expected 53 categories, got ${data.categories?.length}`);
    }
  });

  // --- Observability ---
  await test("API health endpoint", async () => {
    const { res, body } = await fetchJson("/api/health");
    if (!res.ok || body.status !== "ok") throw new Error("health not ok");
    if (body.commercial?.salesEnabled !== false) throw new Error("health reports sales on");
  });

  await test("Commerce health endpoint", async () => {
    const { res } = await fetchJson("/api/health/commerce");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  // --- Deployment risk check (static) ---
  await test("Render blueprint documents SQLite persistence requirement", async () => {
    const yaml = fs.readFileSync(path.join(process.cwd(), "render.yaml"), "utf8");
    if (!yaml.includes("Persistent SQLite") && !yaml.includes("/var/data")) {
      throw new Error("render.yaml missing persistence note");
    }
  });

  // --- Secret scan (patterns only) ---
  await test("No hardcoded Stripe live keys in source", async () => {
    const { execSync } = await import("node:child_process");
    try {
      const hits = execSync(
        'rg -l "sk_live_|rk_live_" --glob "!node_modules" --glob "!.git" --glob "!scripts/final-audit.mjs" . 2>/dev/null || true',
        { cwd: process.cwd(), encoding: "utf8" }
      ).trim();
      if (hits) throw new Error(`potential live keys in: ${hits.split("\n").slice(0, 3).join(", ")}`);
    } catch (err) {
      if (err.message.includes("potential")) throw err;
    }
  });

  console.log(`\nFinal audit: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (findings.length) {
    console.log("\nFailures:");
    for (const f of findings) console.log(`  - ${f.name}: ${f.error}`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
