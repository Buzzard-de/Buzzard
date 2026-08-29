#!/usr/bin/env node
/**
 * Part 3 — Security, Unified Auth & Global Authorization tests
 * Usage: BUZZARD_API_URL=http://localhost:3001 node scripts/part3-security.mjs
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
  console.log(`Part 3 security tests → ${API}\n`);

  await test("GET /api/security/health includes globalRbac", async () => {
    const { res, body } = await fetchJson("/api/security/health");
    if (!res.ok || !body.protections?.globalRbac) throw new Error("missing globalRbac flag");
  });

  await test("Admin route requires auth (401)", async () => {
    const { res } = await fetchJson("/api/admin/control-center/status");
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  let adminToken = null;
  let readonlyToken = null;

  await test("Admin login (administrator)", async () => {
    const { res, body } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@buzzard.de", password: "BuzzardAdmin2026!" }),
    });
    if (!res.ok || !body.token) throw new Error(body.errorKey || `status ${res.status}`);
    adminToken = body.token;
  });

  await test("Read-only login", async () => {
    const { res, body } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "readonly@buzzard.de", password: "BuzzardRead2026!" }),
    });
    if (!res.ok || !body.token) throw new Error(body.errorKey || `status ${res.status}`);
    readonlyToken = body.token;
  });

  if (adminToken) {
    const auth = { Authorization: `Bearer ${adminToken}` };

    await test("RBAC: admin can GET control-center status", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/status", { headers: auth });
      if (!res.ok || !body.services) throw new Error(`status ${res.status}`);
    });

    await test("GET /api/admin/sessions", async () => {
      const { res, body } = await fetchJson("/api/admin/sessions", { headers: auth });
      if (!res.ok || !Array.isArray(body.sessions)) throw new Error(`status ${res.status}`);
    });

    await test("AI blocked permission rejected", async () => {
      const { res, body } = await fetchJson("/api/admin/ai/tasks", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          title: "Blocked perm test",
          employeeId: "product_ai",
          permissionsRequired: ["system.configure"],
        }),
      });
      if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
      if (!body.message?.includes("AI cannot")) throw new Error("expected AI block message");
    });
  }

  if (readonlyToken) {
    const ro = { Authorization: `Bearer ${readonlyToken}` };

    await test("RBAC: read_only denied system.configure PUT (403)", async () => {
      const { res } = await fetchJson("/api/admin/control-center/config/test_key", {
        method: "PUT",
        headers: ro,
        body: JSON.stringify({ value: "x" }),
      });
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
    });

    await test("Privilege: read_only cannot POST AI task assign", async () => {
      const { res } = await fetchJson("/api/admin/ai/tasks", {
        method: "POST",
        headers: ro,
        body: JSON.stringify({
          title: "RO escalation test",
          employeeId: "product_ai",
          permissionsRequired: ["products.read"],
        }),
      });
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
    });
  }

  await test("Bearer POST without CSRF succeeds (login path exempt)", async () => {
    const { res } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "nope@buzzard.de", password: "wrong" }),
    });
    if (res.status !== 401 && res.status !== 429) throw new Error(`unexpected ${res.status}`);
  });

  await test("IDOR: invalid session id rejected", async () => {
    if (!adminToken) throw new Error("no admin token");
    const { res } = await fetchJson("/api/admin/sessions/not valid!", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  console.log(`\n${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
