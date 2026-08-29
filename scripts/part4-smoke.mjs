#!/usr/bin/env node
/**
 * Part 4 — Admin Governance + Persistent Security + Test Automation
 * Usage: BUZZARD_API_URL=http://localhost:3001 node scripts/part4-smoke.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterNavGroupsForRole, canAccessNavSlug } from "../lib/admin/navPermissions.mjs";
import { ADMIN_NAV_GROUPS } from "../lib/admin/nav.config.mjs";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  console.log(`Part 4 smoke tests → ${API}\n`);

  await test("navPermissions: staff cannot see sessions", () => {
    if (canAccessNavSlug("staff", "sessions")) throw new Error("staff should not see sessions");
  });

  await test("navPermissions: catalog_manager sees products", () => {
    if (!canAccessNavSlug("catalog_manager", "products")) throw new Error("missing products");
    if (canAccessNavSlug("catalog_manager", "payments-finance")) throw new Error("should not see payments");
  });

  await test("navPermissions: administrator sees control-center", () => {
    if (!canAccessNavSlug("administrator", "control-center")) throw new Error("missing control-center");
    if (!canAccessNavSlug("administrator", "sessions")) throw new Error("missing sessions");
  });

  await test("rateLimitStore module exports backends", () => {
    const modPath = path.join(__dirname, "..", "server", "lib", "rateLimitStore.js");
    const src = fs.readFileSync(modPath, "utf8");
    if (!src.includes("BUZZARD_RATE_LIMIT_STORE")) throw new Error("missing env abstraction");
    if (!src.includes("createFileBackendSimple")) throw new Error("missing file backend");
  });

  await test("jobQueue module exists", () => {
    const modPath = path.join(__dirname, "..", "server", "lib", "jobQueue.js");
    if (!fs.existsSync(modPath)) throw new Error("jobQueue.js missing");
    const src = fs.readFileSync(modPath, "utf8");
    if (!src.includes("QUEUED")) throw new Error("missing QUEUED status");
  });

  await test("categoryVisibility readiness exports", () => {
    const modPath = path.join(__dirname, "..", "server", "lib", "categoryVisibility.js");
    const src = fs.readFileSync(modPath, "utf8");
    for (const fn of ["computeOverallReadiness", "getReadinessBlockers", "canActivateForSale"]) {
      if (!src.includes(fn)) throw new Error(`missing ${fn}`);
    }
  });

  await test("securityLog querySecurityEvents export", () => {
    const modPath = path.join(__dirname, "..", "server", "lib", "securityLog.js");
    const src = fs.readFileSync(modPath, "utf8");
    if (!src.includes("querySecurityEvents")) throw new Error("missing querySecurityEvents");
    if (!src.includes("privilege_escalation_attempt")) throw new Error("missing severity map");
  });

  await test("sessions page exists", () => {
    const page = path.join(__dirname, "..", "app", "admin", "sessions", "page.tsx");
    if (!fs.existsSync(page)) throw new Error("sessions page missing");
  });

  let adminToken = null;

  await test("Admin login", async () => {
    const { res, body } = await fetchJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@buzzard.de", password: "BuzzardAdmin2026!" }),
    });
    if (!res.ok || !body.token) throw new Error(body.errorKey || `status ${res.status}`);
    adminToken = body.token;
  });

  if (adminToken) {
    const auth = { Authorization: `Bearer ${adminToken}` };

    await test("GET /api/admin/sessions (session management API)", async () => {
      const { res, body } = await fetchJson("/api/admin/sessions", { headers: auth });
      if (!res.ok || !Array.isArray(body.sessions)) throw new Error(`status ${res.status}`);
    });

    await test("GET /api/admin/security/events with pagination", async () => {
      const { res, body } = await fetchJson("/api/admin/security/events?page=1&limit=10", { headers: auth });
      if (!res.ok || !Array.isArray(body.events)) throw new Error(`status ${res.status}`);
      if (!body.pagination?.page) throw new Error("missing pagination");
      if (!body.overview) throw new Error("missing overview");
    });

    await test("GET /api/admin/control-center/jobs", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/jobs", { headers: auth });
      if (!res.ok || !Array.isArray(body.jobs)) throw new Error(`status ${res.status}`);
    });

    await test("POST /api/admin/control-center/jobs enqueue", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/jobs", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ jobType: "part4_smoke_test", priority: "LOW", payload: { test: true } }),
      });
      if (res.status !== 201 || !body.job?.id) throw new Error(`status ${res.status}`);
    });

    await test("Security health includes rateLimitBackend", async () => {
      const { res, body } = await fetchJson("/api/security/health");
      if (!res.ok || !body.protections?.rateLimitBackend) throw new Error("missing rateLimitBackend");
    });

    await test("BUZZARD_SALES_ENABLED remains off in config", async () => {
      const { res, body } = await fetchJson("/api/admin/control-center/config", { headers: auth });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const sales = body.config?.BUZZARD_SALES_ENABLED ?? body.config?.sales_enabled;
      if (sales === "1" || sales === 1 || sales === true) {
        throw new Error("sales must remain disabled");
      }
    });
  }

  console.log(`\nPart 4: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
