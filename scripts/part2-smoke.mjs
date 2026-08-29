#!/usr/bin/env node
/**
 * Part 2 — Control Center + AI Task Orchestration smoke tests
 * Usage: BUZZARD_API_URL=http://localhost:3001 node scripts/part2-smoke.mjs
 */

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`✗ ${name} — ${error.message}`);
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
  console.log(`Part 2 smoke tests → ${API}\n`);

  await test("GET /api/health/db", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (!res.ok || !body.database) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/health/ai", async () => {
    const { res, body } = await fetchJson("/api/health/ai");
    if (!res.ok || !body.orchestrator) throw new Error(`status ${res.status}`);
  });

  await test("GET /api/categories/visibility (public)", async () => {
    const { res, body } = await fetchJson("/api/categories/visibility");
    if (!res.ok || body.success !== true) throw new Error(`status ${res.status}`);
  });

  await test("Admin control center requires auth", async () => {
    const { res } = await fetchJson("/api/admin/control-center/status");
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  let token = null;
  await test("Admin login (seed user)", async () => {
    const { res, body } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@buzzard.de", password: "BuzzardAdmin2026!" }),
    });
    if (body.requires2FA) throw new Error("2FA enabled — use test account without 2FA");
    if (!res.ok || !body.token) throw new Error(body.errorKey || `status ${res.status}`);
    token = body.token;
  });

  if (token) {
    const auth = { Authorization: `Bearer ${token}` };

    await test("GET /api/admin/control-center/status", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/status", { headers: auth });
      if (!res.ok || !body.services) throw new Error(`status ${res.status}`);
    });

    await test("GET /api/admin/ai/employees", async () => {
      const { res, body } = await fetchJson("/api/admin/ai/employees", { headers: auth });
      if (!res.ok || !Array.isArray(body.employees)) throw new Error(`status ${res.status}`);
      if (body.employees.length < 1) throw new Error("no seeded employees");
    });

    await test("POST /api/admin/ai/tasks", async () => {
      const { res, body } = await fetchJson("/api/admin/ai/tasks", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          title: "Part2 smoke task",
          employeeId: "product_ai",
          priority: "NORMAL",
          permissionsRequired: ["products.read"],
        }),
      });
      if (!res.ok || !body.task?.id) throw new Error(body.message || `status ${res.status}`);
    });

    await test("GET /api/admin/approvals", async () => {
      const { res, body } = await fetchJson("/api/admin/approvals", { headers: auth });
      if (!res.ok || !Array.isArray(body.approvals)) throw new Error(`status ${res.status}`);
    });

    await test("GET /api/admin/control-center/integrations", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/integrations", { headers: auth });
      if (!res.ok || !Array.isArray(body.integrations)) throw new Error(`status ${res.status}`);
      if (body.integrations.length < 1) throw new Error("no integrations seeded");
    });

    await test("POST approval + decide flow", async () => {
      const { res: createRes, body: createBody } = await fetchJson("/api/admin/approvals", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          resourceType: "smoke_test",
          resourceId: "smoke-1",
          aiRecommendation: "Approve smoke test",
          reason: "Part2 approval smoke",
          riskLevel: "LOW",
        }),
      });
      if (!createRes.ok || !createBody.approval?.id) throw new Error("approval create failed");
      const { res: decideRes } = await fetchJson(`/api/admin/approvals/${createBody.approval.id}/decide`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ decision: "approve" }),
      });
      if (!decideRes.ok) throw new Error(`decide status ${decideRes.status}`);
    });

    await test("GET /api/admin/control-center/escalations", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/escalations", { headers: auth });
      if (!res.ok || !Array.isArray(body.escalations)) throw new Error(`status ${res.status}`);
    });

    await test("GET /api/admin/control-center/background-jobs", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/background-jobs", { headers: auth });
      if (!res.ok || !Array.isArray(body.jobs)) throw new Error(`status ${res.status}`);
    });

    await test("PATCH category visibility", async () => {
      const { res, body } = await fetchJson("/api/admin/categories/cat-01/visibility", {
        method: "PATCH",
        headers: auth,
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok || !body.visibility) throw new Error(`status ${res.status}`);
    });
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
