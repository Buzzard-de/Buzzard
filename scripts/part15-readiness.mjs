#!/usr/bin/env node
/**
 * Part 15 — Sales readiness gate (does NOT enable sales).
 *
 * Usage:
 *   npm run test:part15
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part15
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;
let blocked = 0;
let conditions = 0;

const gates = {
  persistentDb: false,
  redis: false,
  paymentsConfigured: false,
  salesDisabled: true,
  goLiveLock: false,
  deploymentSynced: false,
  intelligenceLive: false,
  websiteOk: false,
  backupReady: false,
};

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    if (err.blocked) {
      console.log(`⊘ ${name} — ${err.message}`);
      blocked += 1;
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

async function fetchJson(pathname) {
  const res = await fetch(`${API}${pathname}`, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function gitRev(ref = "HEAD") {
  try {
    return execSync(`git rev-parse ${ref}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Part 15 readiness → ${API}\n`);

  await test("1. Part 14 artifacts on main", async () => {
    for (const rel of ["scripts/part14-smoke.mjs", "docs/PART14_LIVE_CLOSEOUT_REPORT.md"]) {
      if (!fs.existsSync(path.join(root, rel))) throw new Error(`missing ${rel}`);
    }
  });

  await test("2. Sales still DISABLED (pre go-live)", async () => {
    const { res, body } = await fetchJson("/api/commerce/status");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.salesEnabled === true || body.flags?.salesEnabled === true) {
      throw new Error("SALES already enabled — run only before go-live");
    }
    gates.salesDisabled = true;
  });

  await test("3. Go-Live Lock active", async () => {
    const { res, body } = await fetchJson("/api/health/production");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.goLiveLock !== true) throw new Error("goLiveLock must be true until sales go-live");
    gates.goLiveLock = true;
  });

  await test("4. Deployment synced", async () => {
    const { res, body } = await fetchJson("/api/health/production");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.deployment?.drift === true) markBlocked("DEPLOYMENT_DRIFT=true");
    gates.deploymentSynced = body.deployment?.drift === false;
    const main = gitRev("origin/main");
    const running = body.version?.commit || body.deployment?.runningCommit;
    if (main && running && !String(running).startsWith(main.slice(0, 12))) {
      markCondition(`main=${main.slice(0, 12)} running=${String(running).slice(0, 12)}`);
    }
  });

  await test("5. Persistent SQLite (REQUIRED)", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const p = body.database?.persistence || {};
    const pathOk = String(body.database?.path || "").includes("/var/data");
    gates.persistentDb = p.persistent === true && pathOk;
    if (!gates.persistentDb) {
      const hint = p.syncHint || p.renderDisk
        ? JSON.stringify({ syncHint: p.syncHint, renderDisk: p.renderDisk })
        : "see docs/DB_PERSISTENCE_RENDER_DE.md";
      markBlocked(`ephemeral DB — ${hint}`);
    }
  });

  await test("6. Backup directory on persistent disk", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const backupDir = body.database?.persistence?.backupDir || "";
    gates.backupReady = backupDir.includes("/var/data");
    if (!gates.backupReady) markBlocked(`backupDir=${backupDir || "unknown"}`);
  });

  await test("7. Redis / rate limit (recommended)", async () => {
    const { res, body } = await fetchJson("/api/security/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
    gates.redis = body.protections?.redisConfigured === true;
    if (!gates.redis) markCondition(`backend=${body.protections?.rateLimitBackend || "unknown"}`);
  });

  await test("8. Payment providers configured (secrets in Render)", async () => {
    const { res, body } = await fetchJson("/api/health/production");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const commerce = body.commerce || {};
    const status = await fetchJson("/api/commerce/status");
    const safety = status.body?.safety || {};
    gates.paymentsConfigured =
      commerce.stripeConfigured === true ||
      commerce.paypalConfigured === true ||
      safety.stripeConfigured === true ||
      safety.paypalConfigured === true ||
      body.commercial?.payments?.configured === true;
    if (!gates.paymentsConfigured) {
      markBlocked("STRIPE_SECRET_KEY / PAYPAL_CLIENT_ID not set in Render — required before sales");
    }
    if (commerce.stripeEnabled === true || commerce.paypalEnabled === true) {
      markCondition("payment flags enabled while SALES=0 — verify intentional dry-run");
    }
  });

  await test("9. Intelligence bridge LIVE", async () => {
    const { res, body } = await fetchJson("/api/intelligence/status");
    if (!res.ok) throw new Error(`status ${res.status}`);
    gates.intelligenceLive = body.bridge === "LIVE";
    if (!gates.intelligenceLive) markCondition(`bridge=${body.bridge}`);
  });

  await test("10. Website reachable", async () => {
    const res = await fetch(`${SITE}/`, { redirect: "follow" });
    gates.websiteOk = res.ok;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await test("11. Production safety suite", async () => {
    try {
      execSync("npm run test:production-safety", {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, BUZZARD_API_URL: API },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      throw new Error(err.stderr?.toString()?.split("\n").pop() || "production-safety failed");
    }
  });

  await test("12. render.yaml sales lock + disk", async () => {
    const yaml = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
    if (!yaml.includes("/var/data")) throw new Error("disk missing in render.yaml");
    if (!yaml.includes('BUZZARD_SALES_ENABLED') || !yaml.includes('"0"')) {
      throw new Error("SALES not locked to 0 in blueprint");
    }
  });

  const required = [
    gates.salesDisabled,
    gates.goLiveLock,
    gates.deploymentSynced,
    gates.persistentDb,
    gates.backupReady,
    gates.paymentsConfigured,
    gates.websiteOk,
  ];
  const recommended = [gates.redis, gates.intelligenceLive];
  const scoreRequired = Math.round((required.filter(Boolean).length / required.length) * 100);
  const scoreAll = Math.round(
    ([...required, ...recommended].filter(Boolean).length / (required.length + recommended.length)) * 100
  );

  console.log("\n--- Part 15 gate summary ---");
  console.log(`PERSISTENT_DB:     ${gates.persistentDb ? "PASS" : "FAIL"}`);
  console.log(`BACKUP_ON_DISK:    ${gates.backupReady ? "PASS" : "FAIL"}`);
  console.log(`PAYMENTS_SECRETS:  ${gates.paymentsConfigured ? "PASS" : "FAIL"}`);
  console.log(`REDIS:             ${gates.redis ? "PASS" : "CONDITION"}`);
  console.log(`SALES_ENABLED:     false (required)`);
  console.log(`GO_LIVE_LOCK:      ${gates.goLiveLock ? "PASS" : "FAIL"}`);
  console.log(`DEPLOYMENT_DRIFT:  ${gates.deploymentSynced ? "false" : "true"}`);
  console.log(`READINESS_SCORE:   ${scoreRequired}% required · ${scoreAll}% overall`);

  console.log(`\nPart 15: ${passed} passed, ${failed} failed, ${blocked} blocked, ${conditions} conditions`);

  if (failed > 0) process.exit(1);
  if (blocked > 0) {
    console.log("\nSTATUS: NOT READY — fix blockers before enabling sales");
    console.log("Guide: docs/PART15_READINESS_DE.md");
    process.exit(2);
  }
  if (conditions > 0) {
    console.log("\nSTATUS: READY WITH CONDITIONS — sales go-live possible after manual approval");
    process.exit(0);
  }
  console.log("\nSTATUS: READY FOR SALES GO-LIVE (manual env flip still required)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
