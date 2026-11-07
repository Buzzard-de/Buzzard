/**
 * Sinan Bey agent runtime. Isolated analysis; no production writes.
 */
const fs = require("fs");
const path = require("path");
const { SYSTEM_INSTRUCTION } = require("./sinanInstruction");
const { identity, coordinate } = require("./sinanBey");
const { getMember, canShare, CLASSIFICATION } = require("./council");
const { createApprovalCenter, RISK } = require("./humanApproval");
const { createSinanDurable, TASK_STATUS } = require("./sinanDurable");
const { assessVoice, providerAdapters } = require("../voice/councilVoice");

const ID = "sinan_bey";

const HUMAN_GATES = Object.freeze([
  "GIT_PUSH",
  "MERGE",
  "DEPLOY",
  "PRODUCTION_RESTORE",
  "DATA_DELETE",
  "LOOSEN_SECURITY",
  "CHANGE_EGRESS_DENY",
  "ENABLE_SALES_OR_PAYMENTS",
  "ENABLE_LIVE_CARRIER",
  "EXPORT_SECRETS",
]);

const DOMAIN_PATHS = Object.freeze({
  buzzard_core: "server/lib",
  pusat_orchestrator: "server/lib/pusat",
  product_engine: "server/lib/productService.js",
  order_engine: "server/lib/commerce/orderService.js",
  inventory_engine: "server/lib/commerce/inventoryIntegration.js",
  marketplace_engine: "server/lib/marketplace",
  pricing_engine: "server/lib/commerce/pricingIntegration.js",
  supplier_integration: "server/lib/supplier",
  returns_engine: "server/lib/logistics/v5/returnsEngine.js",
  tax_customs_ai: "server/lib/commerce/ab27Logistics.js",
  security_infrastructure: "server/lib/security",
  egress_security: "server/lib/security/egressPolicy.js",
  api_and_database: "server/lib/db.js",
  frontend_backend: "app",
  ai_agent_infrastructure: "server/lib/pusat",
  cicd_and_tests: "server/__tests__",
});

function createSinanBeyAgent({ db = null, approvals = createApprovalCenter() } = {}) {
  const durable = db ? createSinanDurable(db) : null;
  const attendance = new Map();

  function esatWatch(type, details) {
    try {
      const esat = require("../security/esatBey");
      return esat.inspect({ type, details, actor: ID });
    } catch {
      return { allowed: false, hold: true, reviewer: "esat_bey", soleDefense: false };
    }
  }

  function profile() {
    return {
      ...identity(),
      title: SYSTEM_INSTRUCTION.title,
      instruction: SYSTEM_INSTRUCTION,
      memoryIsolation: "personal_only_for_owner",
      productionWrite: false,
    };
  }

  function requestHumanGate(action) {
    if (!HUMAN_GATES.includes(action)) return { ok: false, code: "UNKNOWN_GATE" };
    esatWatch("PERMISSION_DENIED", { action, requestedBy: ID });
    return approvals.submit({
      action,
      requestedBy: ID,
      reason: `${action} requires Süleyman Bey approval`,
      risk: RISK.CRITICAL,
      payload: { live: false },
    });
  }

  function assignFromPusat(title) {
    if (durable) return { ok: true, ...durable.assignTask({ fromId: "pusat", title }) };
    return { ok: true, id: "stask_memory", fromId: "pusat", title, status: "NOT_STARTED", durable: false };
  }

  function acceptTask(taskId) {
    if (durable) {
      const updated = durable.setStatus({ taskId, status: "IN_PROGRESS" });
      if (!updated.ok) return updated;
      return { ok: true, accepted: true, taskId, status: "IN_PROGRESS" };
    }
    return { ok: true, accepted: true, taskId, status: "IN_PROGRESS", durable: false };
  }

  function reportToPusat({ taskId, kind, body, status, testResult, branch, commitSha, blockedReason } = {}) {
    if (status && durable) {
      const st = durable.setStatus({ taskId, status, testResult, branch, commitSha, blockedReason });
      if (!st.ok) return st;
    }
    const report = durable
      ? durable.report({ taskId, kind: kind || "pusat_report", body })
      : { ok: true, id: "srep_memory", durable: false };
    return {
      ok: true,
      report,
      liveVerified: false,
      testedIsNotLive: true,
    };
  }

  function requestDoguResearch({ topic, question }) {
    const share = canShare({ fromId: ID, toId: "dogu_bey", classification: CLASSIFICATION.SHARED });
    if (!share) return { ok: false, code: "SHARE_DENIED" };
    const task = coordinate({ toId: "dogu_bey", title: `research:${topic}`, classification: CLASSIFICATION.SHARED });
    return { ok: task.ok, via: "pusat", assigneeId: "dogu_bey", topic, question, sourcedRequired: true, task };
  }

  function analyze({ domain, relativePath } = {}) {
    const mapped = DOMAIN_PATHS[domain];
    const target = relativePath || mapped;
    if (!target) return { ok: false, code: "UNKNOWN_DOMAIN", unknown: true };
    const abs = path.resolve(process.cwd(), target);
    const root = process.cwd();
    if (!abs.startsWith(root)) return { ok: false, code: "PATH_DENIED" };
    const exists = fs.existsSync(abs);
    let kind = "missing";
    if (exists) kind = fs.statSync(abs).isDirectory() ? "directory" : "file";
    return {
      ok: exists,
      domain: domain || "custom",
      path: target,
      kind,
      productionMutation: false,
      recommendation: exists ? "CODE_READY_REVIEW" : "PATH_NOT_FOUND",
      live: false,
    };
  }

  function attendMeeting({ meetingId, present = true, summary } = {}) {
    if (!present) {
      attendance.set(meetingId, false);
      return { attended: false, faked: false, meetingId };
    }
    attendance.set(meetingId, true);
    return {
      attended: true,
      faked: false,
      meetingId,
      speakerId: ID,
      area: "software_architecture",
      summary: summary || "Software status reported. Incomplete work not marked complete.",
    };
  }

  function didAttend(meetingId) {
    return attendance.get(meetingId) === true;
  }

  function voiceAvatar() {
    const voice = assessVoice();
    return {
      avatar: "/council/sinan-bey.png",
      avatarAnimation: false,
      realtimeVoice: false,
      stt: voice.stt,
      tts: voice.tts,
      liveCalls: false,
      providers: providerAdapters(),
      status: "CODE_READY",
      completeClaim: false,
    };
  }

  function backupPersonalMemory() {
    if (!durable) return { ok: false, code: "NO_DURABLE_STORE", completeClaim: false };
    const snap = durable.snapshotMemory(ID);
    return { ok: true, snapshot: snap, offsite: false, worm: false, completeClaim: false };
  }

  function restorePersonalMemory(snapshot) {
    if (!durable) return { ok: false, code: "NO_DURABLE_STORE" };
    return durable.restoreMemorySnapshot(snapshot, { ownerId: ID });
  }

  return {
    id: ID,
    TASK_STATUS,
    HUMAN_GATES,
    profile,
    requestHumanGate,
    assignFromPusat,
    acceptTask,
    reportToPusat,
    requestDoguResearch,
    analyze,
    attendMeeting,
    didAttend,
    voiceAvatar,
    backupPersonalMemory,
    restorePersonalMemory,
    approvals,
    durable,
  };
}

module.exports = { createSinanBeyAgent, HUMAN_GATES, DOMAIN_PATHS, ID };
