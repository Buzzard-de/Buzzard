#!/usr/bin/env node
/**
 * Live Render persistence verification (HTTP only — no Dashboard access).
 * Does NOT register evidence unless --register-evidence (operator).
 * Does NOT claim PASS when endpoint unreachable.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonOut = process.argv.includes("--json");
const register = process.argv.includes("--register-evidence");

execSync("node scripts/build-render-operator-assistant-bridge.mjs", { cwd: root, stdio: "pipe" });
execSync("node scripts/build-render-persistence-evidence-bridge.mjs", { cwd: root, stdio: "pipe" });

const require = createRequire(import.meta.url);
const assistant = require("../server/lib/renderOperatorAssistant.bundle.cjs");
const evidence = require("../server/lib/renderPersistenceEvidenceBridge.bundle.cjs");

let apiBase;
try {
  apiBase = assistant.resolveBuzzardApiBaseUrl(root);
} catch (err) {
  const report = {
    error: err.message,
    RENDER_DASHBOARD_ACTION_REQUIRED: true,
    LIVE_RENDER_DISK: "UNVERIFIED_EXTERNAL",
    LIVE_DB_PATH: "UNVERIFIED_EXTERNAL",
    LIVE_DB_HEALTH: "UNVERIFIED_EXTERNAL",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const healthUrl = `${apiBase}/api/health/db`;
let httpStatus = null;
let httpReachable = false;
let body = null;

try {
  const res = await fetch(healthUrl, { headers: { Accept: "application/json" } });
  httpStatus = res.status;
  httpReachable = true;
  if (res.ok) body = await res.json();
} catch {
  httpReachable = false;
}

const result = assistant.evaluateLivePersistenceFromHealthBody(body, httpStatus, httpReachable);
const report = {
  generatedAt: new Date().toISOString(),
  healthUrl,
  RENDER_DASHBOARD_ACTION_REQUIRED: result.dashboardActionRequired,
  cursorHasRenderDashboardAccess: false,
  blueprintNote: result.blueprintNote,
  http: { reachable: httpReachable, status: httpStatus },
  evaluation: result.evaluation,
  live: result.live,
  SALES_ENABLED: process.env.SALES_ENABLED ?? "0",
};

if (register && result.evaluation.meetsLivePersistenceCriteria) {
  try {
    evidence.registerRenderPersistenceEvidence({
      kind: "RENDER_PERSISTENCE_HEALTH",
      environment: "PRODUCTION",
      source: "RENDER_LIVE",
      timestamp: new Date().toISOString(),
      endpoint: healthUrl,
      dbPath: result.evaluation.path ?? "/var/data/buzzard.db",
      persistent: true,
      backupPath: result.evaluation.backupPath ?? "/var/data/backups",
      healthStatus: "ok",
      evidenceReference: `verify-render-persistence-${Date.now()}`,
      operator: process.env.RENDER_EVIDENCE_OPERATOR || "operator@render-verify",
    });
    report.evidenceRegistered = true;
  } catch (err) {
    report.evidenceRegistered = false;
    report.evidenceError = err.message;
  }
}

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("BUZZARD Render Persistence Verification");
  console.log("=====================================");
  console.log(`URL: ${healthUrl}`);
  console.log(`HTTP reachable: ${httpReachable} status=${httpStatus}`);
  console.log(`LIVE_RENDER_DISK: ${report.live.LIVE_RENDER_DISK}`);
  console.log(`LIVE_DB_PATH: ${report.live.LIVE_DB_PATH}`);
  console.log(`LIVE_DB_HEALTH: ${report.live.LIVE_DB_HEALTH}`);
  console.log(`LIVE_RESTART_PERSISTENCE: ${report.live.LIVE_RESTART_PERSISTENCE}`);
  console.log(`LIVE_BACKUP: ${report.live.LIVE_BACKUP}`);
  console.log(`LIVE_RESTORE: ${report.live.LIVE_RESTORE}`);
  if (result.dashboardActionRequired) {
    console.log("\n*** RENDER DASHBOARD ACTION REQUIRED ***");
    console.log("Cursor cannot create disks or deploy. Complete operator guide steps.");
  }
  if (result.evaluation.reasons.length) {
    console.log(`Reasons: ${result.evaluation.reasons.join(", ")}`);
  }
}

const livePass =
  report.live.LIVE_RENDER_DISK === "PASS" &&
  report.live.LIVE_DB_PATH === "PASS" &&
  report.live.LIVE_DB_HEALTH === "PASS";

process.exit(livePass ? 0 : 1);
