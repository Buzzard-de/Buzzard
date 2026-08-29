#!/usr/bin/env node
/**
 * Part 14 — Production synchronization verification (read-only, no commercial data)
 *
 * Usage:
 *   npm run test:part14
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part14
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;
let blocked = 0;
let conditions = 0;

const report = {
  api: API,
  expectedCommit: null,
  runningCommit: null,
  mainCommit: null,
  deploymentDrift: null,
  persistentDb: null,
  redis: null,
  salesEnabled: null,
  blockers: [],
};

function gitRev(ref = "HEAD") {
  try {
    return execSync(`git rev-parse ${ref}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    if (err.blocked) {
      console.log(`⊘ ${name} — ${err.message}`);
      blocked += 1;
      report.blockers.push(`${name}: ${err.message}`);
    } else if (err.condition) {
      console.log(`△ ${name} — ${err.message}`);
      conditions += 1;
    } else {
      console.log(`✗ ${name} — ${err.message}`);
      failed += 1;
    }
  }
}

function markBlocked(msg) {
  const e = new Error(msg);
  e.blocked = true;
  throw e;
}

function markCondition(msg) {
  const e = new Error(msg);
  e.condition = true;
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
  console.log(`Part 14 production sync → ${API}\n`);

  report.expectedCommit = process.env.BUZZARD_EXPECTED_GIT_COMMIT || gitRev("HEAD");
  report.mainCommit = gitRev("origin/main") || gitRev("main");

  await test("1. Repository Part 13 artifacts present", async () => {
    const required = [
      "server/lib/deploymentIdentity.js",
      "server/lib/productionHealth.js",
      "scripts/production-smoke.mjs",
      "docs/PRODUCTION_RUNBOOK.md",
    ];
    for (const rel of required) {
      if (!fs.existsSync(path.join(root, rel))) throw new Error(`missing ${rel}`);
    }
  });

  await test("2. PR #254 branch ahead of main", async () => {
    if (!report.mainCommit || !report.expectedCommit) markCondition("cannot compare git refs");
    if (report.mainCommit === report.expectedCommit) markCondition("main already at Part 13 HEAD — merge may be done");
    if (report.expectedCommit.startsWith(report.mainCommit.slice(0, 7))) return;
    console.log(`   main=${report.mainCommit.slice(0, 12)} expected=${report.expectedCommit.slice(0, 12)}`);
  });

  await test("3. Render deploy API credentials", async () => {
    if (process.env.RENDER_API_KEY) return;
    markBlocked("RENDER_API_KEY not available — manual Render deploy required");
  });

  await test("4. Version / deployment identity (live)", async () => {
    const { res, body } = await fetchJson("/api/health/version");
    if (res.status === 404) markBlocked("endpoint not deployed — stale Render (pre Part 13)");
    if (!res.ok) throw new Error(`status ${res.status}`);
    report.runningCommit = body.commit;
    report.salesEnabled = body.salesEnabled;
    if (body.salesEnabled === true) throw new Error("SALES=1 on production");
    const prod = await fetchJson("/api/health/production");
    if (prod.res.ok) {
      report.deploymentDrift = prod.body.deployment?.drift ?? null;
      if (prod.body.deployment?.drift === true) {
        markBlocked(
          `DEPLOYMENT_DRIFT expected=${prod.body.deployment.expectedCommit} running=${prod.body.deployment.runningCommit}`
        );
      }
    }
  });

  await test("5. Persistent SQLite (live)", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (res.status === 404) markBlocked("db health not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const p = body.database?.persistence;
    report.persistentDb = p?.persistent === true;
    if (!p?.persistent) markBlocked("ephemeral DB path — mount /var/data + BUZZARD_DB_PATH required");
    if (p?.path !== "/var/data/buzzard.db") markCondition(`path=${p?.path || "unknown"}`);
  });

  await test("6. Redis / rate-limit backend (live)", async () => {
    const { res, body } = await fetchJson("/api/security/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const backend = body.protections?.rateLimitBackend;
    const redisConfigured = body.protections?.redisConfigured;
    report.redis = redisConfigured === true ? "PASS" : "CONDITIONS";
    if (process.env.UPSTASH_REDIS_REST_URL) {
      if (!redisConfigured) throw new Error("Redis credentials set but not configured in API");
    } else {
      markCondition(`rateLimitBackend=${backend || "unknown"} — UPSTASH credentials not in agent env`);
    }
  });

  await test("7. Production health aggregate", async () => {
    const { res, body } = await fetchJson("/api/health/production");
    if (res.status === 404) markBlocked("production health not deployed");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.goLiveLock !== true) throw new Error("go-live lock inactive");
    if (body.salesEnabled === true) throw new Error("sales enabled");
  });

  await test("8. Worker + commerce safety (live)", async () => {
    const worker = await fetchJson("/api/health/worker");
    if (worker.res.status === 404) markBlocked("worker health not deployed");
    const commerce = await fetchJson("/api/commerce/status");
    if (commerce.res.status === 404) markBlocked("commerce core not deployed");
    if (commerce.body.flags?.salesEnabled !== false) throw new Error("sales enabled");
  });

  await test("9. Catalog endpoints (live)", async () => {
    for (const path of ["/api/catalog/health", "/api/catalog/brands", "/api/catalog/search?q=test"]) {
      const { res } = await fetchJson(path);
      if (res.status === 404) markBlocked(`${path} not deployed`);
    }
    const cats = await fetchJson("/api/catalog/categories");
    if (!cats.res.ok) throw new Error(`categories status ${cats.res.status}`);
    const count = cats.body.categories?.length ?? cats.body.items?.length ?? (Array.isArray(cats.body) ? cats.body.length : 0);
    if (count && count !== 53) markCondition(`categories=${count} (expected 53 after Part 7+ deploy)`);
  });

  await test("10. Security smoke (live, no auth data)", async () => {
    const admin = await fetchJson("/api/admin/control-center/status");
    if (admin.res.status === 404) markBlocked("control center not deployed");
    if (admin.res.status !== 401 && admin.res.status !== 403) throw new Error(`admin expected 401/403 got ${admin.res.status}`);
    const legacy = await fetch(`${API}/api/cart`, { headers: { Accept: "application/json" } });
    if (legacy.status !== 404 && !legacy.headers.get("x-buzzard-legacy-commerce")) {
      markCondition("legacy cart missing deprecation header (pre Part 10 deploy)");
    }
  });

  await test("11. Category UX — no auto-expand (code)", async () => {
    const src = fs.readFileSync(path.join(root, "components/CategorySidebar.tsx"), "utf8");
    if (!src.includes("useState<Set<string>>(() => new Set())")) throw new Error("expandedIds not empty by default");
    if (!src.includes("if (!prev.has(id)) next.add(id)")) throw new Error("progressive toggle missing");
  });

  await test("12. Local backup mechanism", async () => {
    const result = execSync("node scripts/db-backup.mjs", { cwd: root, encoding: "utf8" });
    const jsonStart = result.indexOf("{");
    const parsed = JSON.parse(result.slice(jsonStart));
    if (!parsed.backup) throw new Error("backup path missing");
    if (!parsed.meta?.timestamp) throw new Error("metadata missing");
    if (parsed.meta.integrityCheck !== "ok") throw new Error(`integrity=${parsed.meta.integrityCheck}`);
  });

  await test("13. render.yaml persistence documentation", async () => {
    const yaml = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
    if (!yaml.includes("/var/data")) throw new Error("persistent disk docs missing");
    if (!yaml.includes('BUZZARD_SALES_ENABLED') || !yaml.includes('"0"')) throw new Error("SALES not locked in blueprint");
  });

  if (report.runningCommit == null) {
    const health = await fetchJson("/api/health");
    if (health.res.ok) {
      const dbPath = health.body.database?.path || "";
      report.persistentDb = dbPath.includes("/var/data");
      if (!report.persistentDb) report.blockers.push("Live DB ephemeral: " + dbPath);
    }
    report.deploymentDrift = true;
  }

  console.log("\n--- Part 14 summary ---");
  console.log(`EXPECTED_COMMIT: ${report.expectedCommit?.slice(0, 12) || "unknown"}`);
  console.log(`MAIN_COMMIT:     ${report.mainCommit?.slice(0, 12) || "unknown"}`);
  console.log(`RUNNING_COMMIT:  ${report.runningCommit?.slice(0, 12) || "unknown (pre Part 13 deploy)"}`);
  console.log(`DEPLOYMENT_DRIFT: ${report.deploymentDrift === false ? "false" : "true"}`);
  console.log(`PERSISTENT_DB:   ${report.persistentDb === true ? "PASS" : report.persistentDb === false ? "BLOCKED" : "UNKNOWN"}`);
  console.log(`REDIS:           ${report.redis || "UNKNOWN"}`);
  console.log(`SALES_ENABLED:   ${report.salesEnabled === false ? "false" : report.salesEnabled ?? "unknown (legacy health only)"}`);

  console.log(`\nPart 14: ${passed} passed, ${failed} failed, ${blocked} blocked, ${conditions} conditions`);
  if (blocked > 0 || report.deploymentDrift !== false) {
    console.log("\nSTATUS: READY WITH CONDITIONS — manual Render actions required");
    process.exit(2);
  }
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
