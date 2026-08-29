#!/usr/bin/env node
/**
 * Part 5 — Automation, Worker, Integration foundation tests
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
  console.log(`Part 5 smoke tests → ${API}\n`);

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
    console.log(`\nPart 5: ${passed} passed, ${failed} failed (no token)`);
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${token}` };

  await test("GET /api/admin/automation/overview", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/overview", { headers: auth });
    if (!res.ok || !body.worker) throw new Error(`status ${res.status}`);
    if (!body.jobTypes?.includes("PRODUCT_SYNC")) throw new Error("missing job types");
  });

  await test("GET /api/admin/automation/worker", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/worker", { headers: auth });
    if (!res.ok || !body.worker?.status) throw new Error(`status ${res.status}`);
  });

  await test("POST enqueue SYSTEM_HEALTH job", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/jobs", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ jobType: "SYSTEM_HEALTH", priority: "LOW" }),
    });
    if (res.status !== 201 || !body.job?.id) throw new Error(`status ${res.status}`);
  });

  await test("POST sync/product dry run", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/sync/product", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ dryRun: true }),
    });
    if (res.status !== 201 || !body.job?.id) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/admin/automation/schedules", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/schedules", { headers: auth });
    if (!res.ok || !Array.isArray(body.schedules)) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/admin/automation/integrations/health", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/integrations/health?refresh=1", { headers: auth });
    if (!res.ok || !Array.isArray(body.health)) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/admin/automation/suppliers", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/suppliers", { headers: auth });
    if (!res.ok || !body.suppliers?.length) throw new Error(`status ${res.status}`);
    if (body.suppliers[0].ordersEnabled !== false) throw new Error("orders must be disabled");
  });

  await test("GET category readiness check", async () => {
    const { res, body } = await fetchJson("/api/admin/automation/readiness/Automotive", { headers: auth });
    if (!res.ok || !body.readiness?.checks) throw new Error(`status ${res.status}`);
  });

  await test("Security health includes redisConfigured", async () => {
    const { res, body } = await fetchJson("/api/security/health");
    if (!res.ok || body.protections?.redisConfigured === undefined) {
      throw new Error("missing redisConfigured");
    }
  });

  await test("BUZZARD_SALES_ENABLED remains off", async () => {
    const { res, body } = await fetchJson("/api/admin/control-center/config", { headers: auth });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const sales = body.config?.BUZZARD_SALES_ENABLED ?? body.config?.sales_enabled;
    if (sales === "1" || sales === 1) throw new Error("sales enabled");
  });

  console.log(`\nPart 5: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
