/**
 * Phase 1 — Core system & data integrity gate (software-completable scope).
 * Live :3001 process verification is tracked separately as BLOCKED_EXTERNAL.
 */
const crypto = require("crypto");
const { execFileSync } = require("child_process");
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

const DATA_STATES = Object.freeze({
  PRESENT_AND_MATCHED: "PRESENT_AND_MATCHED",
  PRESENT_AND_HASH_MISMATCH: "PRESENT_AND_HASH_MISMATCH",
  ABSENT_IN_CLEAN_CHECKOUT: "ABSENT_IN_CLEAN_CHECKOUT",
  UNEXPECTEDLY_MISSING: "UNEXPECTEDLY_MISSING",
  UNREADABLE: "UNREADABLE",
  INVALID_BASELINE: "INVALID_BASELINE",
});

const SAFE_ABSENCE = new Set([DATA_STATES.ABSENT_IN_CLEAN_CHECKOUT]);
const VERIFIED_MATCH = new Set([DATA_STATES.PRESENT_AND_MATCHED]);

function defaultBaselinePath(repoRoot) {
  return path.join(
    repoRoot,
    "artifacts/buzzard-security-admin-final-sprint-checkpoint-2026-11-18/baseline-hashes.json"
  );
}

const READONLY_GIT = new Set(["rev-parse", "status", "merge-base", "check-ignore", "ls-files"]);

function gitSucceeds(repoRoot, args) {
  return gitOutput(repoRoot, args).ok;
}

function gitOutput(repoRoot, args) {
  if (!READONLY_GIT.has(args[0])) return { ok: false, code: "GIT_COMMAND_REFUSED" };
  if (args.some((arg) => arg === "--hard" || arg === "clean" || arg === "reset" || arg === "checkout")) {
    return { ok: false, code: "GIT_COMMAND_REFUSED" };
  }
  try {
    const stdout = execFileSync("git", ["-C", repoRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout };
  } catch {
    return { ok: false, code: "GIT_FAILED" };
  }
}

function inspectRepositoryBaseline(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const branch = gitOutput(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = gitOutput(repoRoot, ["rev-parse", "HEAD"]);
  const status = gitOutput(repoRoot, ["status", "--porcelain"]);
  if (!branch.ok || !head.ok || !status.ok) {
    return {
      id: "CORE_REPOSITORY_BASELINE",
      ok: false,
      code: branch.code || head.code || status.code || "GIT_FAILED",
      wrote: false,
      destroyed: false,
    };
  }
  const headText = head.stdout.trim();
  const branchText = branch.stdout.trim();
  const dirtyCount = status.stdout.split("\n").filter((line) => line.trim()).length;
  const headOk = /^[0-9a-f]{40}$/.test(headText);
  let ancestor = null;
  if (options.ancestor) {
    const probe = gitOutput(repoRoot, ["merge-base", "--is-ancestor", String(options.ancestor), "HEAD"]);
    ancestor = { commit: String(options.ancestor), isAncestor: probe.ok };
  }
  return {
    id: "CORE_REPOSITORY_BASELINE",
    ok: headOk && branchText.length > 0,
    code: headOk ? "INSPECTED" : "HEAD_INVALID",
    branch: branchText,
    head: headText,
    dirty: dirtyCount > 0,
    dirtyCount,
    ancestor,
    wrote: false,
    destroyed: false,
  };
}

function loadBaseline(baselinePath) {
  let raw;
  try {
    raw = fs.readFileSync(baselinePath, "utf8");
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!parsed || typeof parsed.files !== "object" || parsed.files == null || Array.isArray(parsed.files)) {
    return { ok: false, reason: "missing-files" };
  }
  const hashes = {};
  for (const name of PROTECTED_FILES) {
    const sha = parsed.files[name] && parsed.files[name].sha256;
    if (typeof sha !== "string" || !/^[a-f0-9]{64}$/i.test(sha)) {
      return { ok: false, reason: "invalid-sha256", name };
    }
    hashes[name] = sha.toLowerCase();
  }
  return { ok: true, hashes };
}

function readProtectedFile(full) {
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    return { state: DATA_STATES.UNREADABLE };
  }
  if (!stat.isFile()) return { state: DATA_STATES.UNREADABLE };
  try {
    const buf = fs.readFileSync(full);
    return { actual: crypto.createHash("sha256").update(buf).digest("hex") };
  } catch {
    return { state: DATA_STATES.UNREADABLE };
  }
}

function absenceIsExpectedCleanCheckout(repoRoot, dataDir) {
  const canonicalData = path.resolve(repoRoot, "server/data");
  if (path.resolve(dataDir) !== canonicalData) return false;
  for (const name of PROTECTED_FILES) {
    const rel = path.join("server/data", name);
    if (!gitSucceeds(repoRoot, ["check-ignore", "-q", "--", rel])) return false;
    if (gitSucceeds(repoRoot, ["ls-files", "--error-unmatch", "--", rel])) return false;
  }
  return true;
}

function checkProtectedDataIntegrity(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const dataDir = path.resolve(options.dataDir || path.join(repoRoot, "server/data"));
  const baselinePath = options.baselinePath || defaultBaselinePath(repoRoot);
  const baseline = loadBaseline(baselinePath);
  if (!baseline.ok) {
    return {
      id: "CORE_PROTECTED_DATA",
      ok: false,
      hashVerified: false,
      baselineState: DATA_STATES.INVALID_BASELINE,
      baselineReason: baseline.reason,
      baselineName: baseline.name || null,
      files: PROTECTED_FILES.map((name) => ({
        name,
        state: DATA_STATES.INVALID_BASELINE,
        ok: false,
        hashVerified: false,
      })),
      liveProcessVerified: false,
      note: "Baseline manifest is missing or does not contain a SHA-256 for every protected file.",
    };
  }

  const present = PROTECTED_FILES.map((name) => ({
    name,
    full: path.join(dataDir, name),
    exists: fs.existsSync(path.join(dataDir, name)),
  }));
  const allAbsent = present.every((entry) => !entry.exists);
  const cleanCheckout = allAbsent && absenceIsExpectedCleanCheckout(repoRoot, dataDir);

  const files = present.map((entry) => {
    if (!entry.exists) {
      const state = cleanCheckout ? DATA_STATES.ABSENT_IN_CLEAN_CHECKOUT : DATA_STATES.UNEXPECTEDLY_MISSING;
      return {
        name: entry.name,
        state,
        ok: SAFE_ABSENCE.has(state),
        hashVerified: false,
      };
    }
    const read = readProtectedFile(entry.full);
    if (read.state === DATA_STATES.UNREADABLE) {
      return { name: entry.name, state: DATA_STATES.UNREADABLE, ok: false, hashVerified: false };
    }
    const expected = baseline.hashes[entry.name];
    if (read.actual === expected) {
      return {
        name: entry.name,
        state: DATA_STATES.PRESENT_AND_MATCHED,
        ok: true,
        hashVerified: true,
      };
    }
    return {
      name: entry.name,
      state: DATA_STATES.PRESENT_AND_HASH_MISMATCH,
      ok: false,
      hashVerified: false,
      expected,
      actual: read.actual,
    };
  });

  const hashVerified = files.every((file) => VERIFIED_MATCH.has(file.state));
  return {
    id: "CORE_PROTECTED_DATA",
    ok: files.every((file) => file.ok),
    hashVerified,
    baselineState: "VALID",
    files,
    liveProcessVerified: false,
    note: hashVerified
      ? "Every protected runtime file matches the baseline SHA-256."
      : "Absent gitignored runtime files are reported. A hash mismatch, an unreadable file, or an unexplained absence is not a pass.",
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
    check(
      "CORE_DEVLIST_EACH_ITEM",
      devList.items.length === 51 &&
        devList.items.every((item) => item.status === "CODE_COMPLETE" || item.status === "ALREADY_COMPLETE" || item.status === "LIVE_BLOCKED") &&
        devList.items.filter((item) => item.status === "LIVE_BLOCKED").every((item) => item.live === false && item.code),
      {
        partial: devList.items.filter((item) => item.status === "PARTIAL").map((item) => item.n),
      }
    ),
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
    live: false,
    completeClaim: false,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  evaluatePhase1CoreIntegrity,
  PROTECTED_FILES,
  DATA_STATES,
  checkProtectedDataIntegrity,
  inspectRepositoryBaseline,
};