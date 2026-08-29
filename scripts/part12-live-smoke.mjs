#!/usr/bin/env node
/**
 * Part 12 — Live Render production smoke (read-only + safety checks)
 * Does NOT create real payments or supplier orders.
 *
 * Usage:
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com node scripts/part12-live-smoke.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const API = (process.env.BUZZARD_API_URL || "").replace(/\/$/, "");

if (!API) {
  console.error("Set BUZZARD_API_URL to run live smoke (e.g. https://buzzard-api.onrender.com)");
  process.exit(2);
}

let passed = 0;
let failed = 0;
let skipped = 0;

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
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log(`Part 12 LIVE smoke → ${API}\n`);

  await test("API health", async () => {
    const { res, body } = await fetchJson("/api/health");
    if (!res.ok || body.status !== "ok") throw new Error("health failed");
    if (body.commercial?.salesEnabled !== false) throw new Error("sales must be off on live");
  });

  await test("DB health + persistence info", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const persistence = body.database?.persistence || body.persistence;
    if (!persistence?.mode) skip("persistence metadata not deployed yet");
  });

  await test("Security health", async () => {
    const { res, body } = await fetchJson("/api/security/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.globalRbac) throw new Error("globalRbac missing");
  });

  await test("Catalog health", async () => {
    const { res } = await fetchJson("/api/catalog/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await test("Commerce status SALES=0", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("sales enabled on live");
  });

  await test("Commercial checkout blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `live-${Date.now()}` }),
    });
    if (res.status === 429) skip("rate limited");
    if (body.commercialOrders !== 0) throw new Error("commercial orders on live");
  });

  await test("Admin route requires auth", async () => {
    const { res } = await fetchJson("/api/admin/control-center/status");
    if (res.status !== 401 && res.status !== 403) throw new Error(`expected 401/403 got ${res.status}`);
  });

  await test("Public catalog reachable", async () => {
    const { res } = await fetchJson("/api/catalog/products?limit=1");
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  console.log(`\nLive smoke: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
  if (passed === 0 && skipped > 0) {
    console.log("\nLIVE VERIFICATION PENDING — API unreachable or not fully deployed");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
