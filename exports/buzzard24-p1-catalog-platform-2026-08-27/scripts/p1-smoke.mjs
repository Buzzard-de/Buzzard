#!/usr/bin/env node
/**
 * P1 catalog platform smoke tests (tasks 05–15).
 * Ensures catalog mode stays active — no sales, no payment calls.
 *
 * Usage:
 *   node scripts/p1-smoke.mjs
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com node scripts/p1-smoke.mjs
 */

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

const results = [];

async function check(name, fn) {
  try {
    const result = await fn();
    const ok = result.ok !== false;
    results.push({ name, ok, ...result });
    const icon = ok ? "✓" : "✗";
    console.log(`${icon} ${name}${result.detail ? ` — ${result.detail}` : ""}`);
    return ok;
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`✗ ${name} — ${error.message}`);
    return false;
  }
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, ok: res.ok };
}

async function main() {
  console.log(`P1 smoke tests against ${API}\n`);

  await check("health endpoint", async () => {
    const res = await fetchJson("/api/health");
    return {
      ok: res.ok && res.body?.status !== "error",
      detail: `status=${res.status}`,
      salesEnabled: res.body?.salesEnabled,
    };
  });

  await check("P1 module health", async () => {
    const res = await fetchJson("/api/p1/health");
    return { ok: res.ok && res.body?.ok === true, detail: `catalog_mode=${res.body?.catalog_mode}` };
  });

  await check("P1 platform status", async () => {
    const res = await fetchJson("/api/p1/status");
    return {
      ok: res.ok && res.body?.catalog_mode === true,
      detail: `products=${res.body?.product_count}`,
    };
  });

  await check("sales disabled (catalog mode)", async () => {
    const res = await fetchJson("/api/p1/status");
    const disabled = res.body?.catalog_mode === true && res.body?.sales_enabled === false;
    return { ok: disabled, detail: `catalog_mode=${res.body?.catalog_mode}` };
  });

  await check("checkout blocked without auth", async () => {
    const res = await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ sku: "TEST", quantity: 1, unit_price: 1 }] }),
    });
    const blocked = res.status === 403 || res.status === 401;
    return { ok: blocked, detail: `status=${res.status}` };
  });

  await check("product validator (public 401 expected without admin)", async () => {
    const res = await fetchJson("/api/admin/p1/products/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", sku: "T1", supplier_id: "SUP-DEMO-001", supplier_sku: "T1" }),
    });
    return { ok: res.status === 401 || res.status === 403, detail: `status=${res.status}` };
  });

  await check("Google merchant feed XML", async () => {
    const res = await fetch(`${API}/api/localization/feed/google.xml`);
    const text = await res.text();
    const ok = res.ok && text.includes("<rss") || text.includes("<?xml");
    return { ok, detail: `status=${res.status}` };
  });

  await check("orchestrator status (configured or not)", async () => {
    const res = await fetchJson("/api/orchestrator/status");
    return { ok: res.ok, detail: res.body?.configured ? "configured" : "not_configured" };
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log(`\n${passed}/${results.length} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
