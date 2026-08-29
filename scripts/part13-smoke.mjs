#!/usr/bin/env node
/**
 * Part 13 — Local smoke tests (deployment identity, health, integrity, safety)
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
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

async function fetchJson(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log(`Part 13 smoke → ${API}\n`);

  await test("GET /api/health/version", async () => {
    const { res, body } = await fetchJson("/api/health/version");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.commit || !body.service) throw new Error("missing identity fields");
    if (body.salesEnabled !== false) throw new Error("sales must be false");
  });

  await test("GET /api/health/production", async () => {
    const { res, body } = await fetchJson("/api/health/production");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.database?.integrity) throw new Error("missing integrity");
    if (body.goLiveLock !== true) throw new Error("go-live lock off");
  });

  await test("GET /api/health/worker", async () => {
    const { res, body } = await fetchJson("/api/health/worker");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (!body.worker) throw new Error("missing worker");
  });

  await test("DB integrity module", async () => {
    const { runIntegrityCheck } = require("../server/lib/dbIntegrity.js");
    const result = runIntegrityCheck();
    if (result.integrityCheck !== "ok") throw new Error(result.integrityCheck);
  });

  await test("deploymentIdentity module", async () => {
    const di = require("../server/lib/deploymentIdentity.js");
    const id = di.getDeploymentIdentity();
    if (!id.version) throw new Error("no version");
    const drift = di.getDeploymentDrift();
    if (!drift.status) throw new Error("no drift status");
  });

  await test("environment validation rejects test mode in production", async () => {
    const prev = process.env.NODE_ENV;
    const prevTest = process.env.BUZZARD_TEST_MODE;
    process.env.NODE_ENV = "production";
    process.env.BUZZARD_TEST_MODE = "1";
    delete require.cache[require.resolve("../server/lib/environmentValidation.js")];
    const ev = require("../server/lib/environmentValidation.js");
    const result = ev.validateEnvironment();
    process.env.NODE_ENV = prev;
    if (prevTest === undefined) delete process.env.BUZZARD_TEST_MODE;
    else process.env.BUZZARD_TEST_MODE = prevTest;
    delete require.cache[require.resolve("../server/lib/environmentValidation.js")];
    if (result.ok) throw new Error("expected failure");
  });

  await test("production smoke script exists", async () => {
    if (!fs.existsSync(path.join(process.cwd(), "scripts/production-smoke.mjs"))) {
      throw new Error("missing production-smoke.mjs");
    }
  });

  await test("Part 13 docs exist", async () => {
    for (const doc of ["PART13_FINAL_REPORT.md", "PRODUCTION_RUNBOOK.md", "PRODUCTION_SMOKE.md"]) {
      if (!fs.existsSync(path.join(process.cwd(), "docs", doc))) throw new Error(`missing ${doc}`);
    }
  });

  await test("Commerce safety regression", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("sales enabled");
  });

  console.log(`\nPart 13: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
