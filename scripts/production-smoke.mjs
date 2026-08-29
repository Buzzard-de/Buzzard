#!/usr/bin/env node
/**
 * Part 13 — Production live smoke (read-only + safety, no commercial transactions)
 *
 * Usage:
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const API = (process.env.BUZZARD_API_URL || "").replace(/\/$/, "");

if (!API) {
  console.error("Set BUZZARD_API_URL (e.g. https://buzzard-api.onrender.com)");
  process.exit(2);
}

let passed = 0;
let failed = 0;
let skipped = 0;
let blocked = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    if (err.skip) {
      console.log(`○ ${name} — ${err.message}`);
      skipped += 1;
    } else if (err.blocked) {
      console.log(`⊘ ${name} — ${err.message}`);
      blocked += 1;
    } else {
      console.log(`✗ ${name} — ${err.message}`);
      failed += 1;
    }
  }
}

function skip(msg) {
  const e = new Error(msg);
  e.skip = true;
  throw e;
}

function markBlocked(msg) {
  const e = new Error(msg);
  e.blocked = true;
  throw e;
}

async function fetchJson(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function expectedCommit() {
  if (process.env.BUZZARD_EXPECTED_GIT_COMMIT) return process.env.BUZZARD_EXPECTED_GIT_COMMIT;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Production smoke → ${API}\n`);
  const expected = expectedCommit();

  await test("1. API reachable", async () => {
    const { res } = await fetchJson("/api/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await test("2. Version / deployment identity", async () => {
    const { res, body } = await fetchJson("/api/health/version");
    if (res.status === 404) markBlocked("endpoint not deployed — stale Render");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.commit) throw new Error("missing commit");
    console.log(`   running=${body.commit} branch=${body.branch} expected=${expected?.slice(0, 12) || "?"}`);
    const prod = await fetchJson("/api/health/production");
    if (prod.res.ok && prod.body.deployment?.drift === true) {
      markBlocked(
        `DEPLOYMENT_DRIFT expected=${prod.body.deployment.expectedCommit} running=${prod.body.deployment.runningCommit}`
      );
    } else if (expected && body.commit !== "unknown" && expected.slice(0, 12) !== body.commit) {
      markBlocked(`DEPLOYMENT_DRIFT expected=${expected.slice(0, 12)} running=${body.commit}`);
    }
  });

  await test("3. Health summary", async () => {
    const { res, body } = await fetchJson("/api/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.commercial?.salesEnabled === true) throw new Error("SALES=1 on production");
  });

  await test("4. DB health + persistence", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (res.status === 404) markBlocked("db health not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const p = body.database?.persistence;
    if (!p?.mode) skip("persistence metadata missing");
    if (process.env.REQUIRE_PERSISTENT_DB === "1" && !p.persistent) {
      throw new Error("persistent disk not configured");
    }
  });

  await test("5. Security health", async () => {
    const { res, body } = await fetchJson("/api/security/health");
    if (res.status === 404) markBlocked("security health not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.protections?.globalRbac) throw new Error("globalRbac missing");
  });

  await test("6. Production health aggregate", async () => {
    const { res, body } = await fetchJson("/api/health/production");
    if (res.status === 404) markBlocked("production health not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.salesEnabled === true) throw new Error("sales enabled");
  });

  await test("7. Worker health", async () => {
    const { res, body } = await fetchJson("/api/health/worker");
    if (res.status === 404) skip("worker health not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.worker?.supplierOrdersBlocked !== true) throw new Error("supplier not blocked");
  });

  await test("8. Catalog health", async () => {
    const { res } = await fetchJson("/api/catalog/health");
    if (res.status === 404) markBlocked("catalog not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await test("9. Public catalog", async () => {
    const { res } = await fetchJson("/api/catalog/products?limit=1");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await test("10. Categories (53 L1)", async () => {
    const { res, body } = await fetchJson("/api/catalog/categories");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const count = body.categories?.length ?? body.items?.length;
    if (count && count !== 53) throw new Error(`expected 53 got ${count}`);
  });

  await test("11. Commerce readiness SALES=0", async () => {
    const { res, body } = await fetchJson("/api/commerce/status");
    if (res.status === 404) markBlocked("commerce core not deployed");
    if (body.flags?.salesEnabled !== false) throw new Error("sales enabled");
  });

  await test("12. Commercial checkout blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `prod-smoke-${Date.now()}` }),
    });
    if (res.status === 404) markBlocked("checkout attempt not deployed");
    if (res.status === 429) skip("rate limited");
    if (body.commercialOrders !== 0) throw new Error("commercial orders created");
  });

  await test("13. Admin auth required", async () => {
    const { res } = await fetchJson("/api/admin/control-center/status");
    if (res.status !== 401 && res.status !== 403) throw new Error(`expected 401/403 got ${res.status}`);
  });

  await test("14. Price tampering blocked", async () => {
    const catalog = await fetchJson("/api/catalog/products?q=BZ-CORE&limit=1");
    const productId = catalog.body.items?.[0]?.id;
    if (!productId) skip("no demo product");
    const cart = await fetchJson("/api/commerce/cart", {
      method: "POST",
      body: JSON.stringify({ sessionId: `prod-${Date.now()}` }),
    });
    if (!cart.res.ok) skip("cart unavailable");
    const tamper = await fetchJson(`/api/commerce/cart/${cart.body.cart.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1, clientPrice: 0.01 }),
    });
    if (tamper.res.ok) throw new Error("tampering accepted");
  });

  await test("15. Legacy cart deprecation header", async () => {
    const res = await fetch(`${API}/api/cart`, { headers: { Accept: "application/json" } });
    if (res.status === 404) skip("legacy cart absent");
    const legacy = res.headers.get("x-buzzard-legacy-commerce");
    if (!legacy) throw new Error("missing legacy header");
  });

  console.log(`\nProduction smoke: ${passed} passed, ${failed} failed, ${skipped} skipped, ${blocked} blocked`);
  if (blocked > 0) {
    console.log("\nLIVE VERIFICATION: BLOCKED — production deployment stale or incomplete");
    process.exit(blocked > failed ? 2 : 1);
  }
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
