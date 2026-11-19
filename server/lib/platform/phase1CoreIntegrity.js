/**
 * Phase 1 — Core system & data integrity gate (software-completable scope).
 * Live :3001 process verification is tracked separately as BLOCKED_EXTERNAL.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { snapshot: engineSnapshot } = require("../commerce/engineRegistry");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { SHARED, evaluateEgress } = require("../security/egressPolicy");
const { validateConfiguration } = require("../operations/configurationValidation");
const { validateTaxonomy } = require("../taxonomy/validateTaxonomy");
const { evaluateDevList51 } = require("./devList51");
const { PRODUCTION_SAFETY_LOCK } = require("../commerce/goLiveApproval");
const { adminBootstrapStatus } = require("../auth");
const { isProduction } = require("../runtimeEnv");

const PROTECTED_FILES = Object.freeze([
  "admin-sessions.json",
  "admin-users.json",
  "audit-log.json",
  "automation-events.json",
  "buzzard.db",
  "customers.json",
  "security-log.json",
]);

const BASELINE = path.join(
  process.cwd(),
  "artifacts/buzzard-security-admin-final-sprint-checkpoint-2026-11-18/baseline-hashes.json"
);

function sha256File(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function checkProtectedDataIntegrity() {
  const dataDir = path.join(process.cwd(), "server/data");
  const missing = [];
  const jsonHashMismatch = [];
  let dbDrift = null;
  let baseline = null;
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  } catch {
    baseline = null;
  }
  for (const name of PROTECTED_FILES) {
    const full = path.join(dataDir, name);
    if (!fs.existsSync(full)) {
      missing.push(name);
      continue;
    }
    if (!baseline?.files?.[name]?.sha256) continue;
    const actual = sha256File(full);
    if (actual === baseline.files[name].sha256) continue;
    if (name === "buzzard.db") {
      dbDrift = { expected: baseline.files[name].sha256, actual, note: "DB bytes may drift in dev; JSON stores are frozen-checked." };
      continue;
    }
    jsonHashMismatch.push({ name, expected: baseline.files[name].sha256, actual });
  }
  return {
    id: "CORE_PROTECTED_DATA",
    ok: missing.length === 0 && jsonHashMismatch.length === 0,
    missing,
    jsonHashMismatch,
    dbDrift,
    baselineAvailable: Boolean(baseline),
    liveProcessVerified: false,
    note: "Six JSON stores must match checkpoint hash; buzzard.db presence required, drift reported separately.",
  };
}

function check(name, ok, detail = {}) {
  return { id: name, ok: Boolean(ok), ...detail };
}

function evaluatePhase1CoreIntegrity() {
  const engines = engineSnapshot();
  const sales = evaluateSalesGate();
  const config = validateConfiguration();
  const taxonomy = validateTaxonomy();
  const devList = evaluateDevList51();
  const egressSample = evaluateEgress({
    destinationUrl: "https://example.com/test",
    payload: { orderId: "x" },
  });
  const bootstrap = adminBootstrapStatus();

  const checks = [
    check("CORE_ENGINES_11", engines.count === 11 && engines.anyLive === false, { count: engines.count }),
    check("CORE_SALES_LOCKED", sales.status === "LOCKED" && !sales.allowed, { status: sales.status }),
    check("CORE_EGRESS_DENY", SHARED.default === "DENY", { default: SHARED.default }),
    check("CORE_EGRESS_SAMPLE_BLOCKED", egressSample.allowed === false, { code: egressSample.code }),
    check("CORE_CONFIG_VALID", config.ok === true, { errors: config.errors?.length || 0 }),
    check("CORE_TAXONOMY", taxonomy.ok === true && taxonomy.master50 === 50, { master50: taxonomy.master50 }),
    check("CORE_DEVLIST_NO_FAIL", devList.items.every((i) => i.status !== "FAILED"), {
      failed: devList.items.filter((i) => i.status === "FAILED").length,
    }),
    check("CORE_DEVLIST_BLOCKED_ONLY", devList.items.filter((i) => i.status === "LIVE_BLOCKED").length === 6, {
      blocked: devList.items.filter((i) => i.status === "LIVE_BLOCKED").map((i) => i.n),
    }),
    check("CORE_PRODUCTION_SAFETY_LOCK", PRODUCTION_SAFETY_LOCK === true, {}),
    check("CORE_ENGINE_FLAGS", engines.productionReady === false && engines.salesEnabled === false, {
      productionReady: engines.productionReady,
    }),
    check(
      "CORE_NO_DEMO_ADMIN_AUTO",
      !isProduction() || bootstrap.state !== "seed_demo",
      { bootstrap: bootstrap.state, production: isProduction() }
    ),
    checkProtectedDataIntegrity(),
  ];

  const softwareChecks = checks.filter((c) => c.id !== "CORE_PROTECTED_DATA" || c.ok !== undefined);
  const passed = softwareChecks.filter((c) => c.ok).length;
  const total = softwareChecks.length;
  const percent = Math.round((passed / total) * 1000) / 10;

  const liveBlockers = [
    { id: "LIVE_API_3001_SECURITY", status: "BLOCKED_EXTERNAL", note: "Patch not applied to running API without authorized restart." },
  ];

  return {
    phase: 1,
    title: "Çekirdek sistem ve veri bütünlüğü",
    ok: passed === total,
    percentComplete: percent,
    passed,
    total,
    checks: softwareChecks,
    invariants: {
      salesLocked: sales.status === "LOCKED",
      egressDeny: SHARED.default === "DENY",
      productionReady: false,
      live: false,
    },
    liveBlockers,
    completeClaim: passed === total,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { evaluatePhase1CoreIntegrity, PROTECTED_FILES, checkProtectedDataIntegrity };