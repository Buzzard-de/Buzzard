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
const { catalog } = require("../buzzardNative/motors");
const { createNativeRuntime } = require("../buzzardNative/runtimeCore");
const { createLab } = require("../buzzardNative/thinking/lab");
const { createTransformerLab } = require("../buzzardNative/thinking/transformerLab");
const { runReasoning, runReasoningPhase6 } = require("../buzzardNative/thinking/reasoningEval");
const { analyzeOfficialVoice, writeProfile, VOICE_ID } = require("../buzzardNative/speech/voiceIdentity");
const { protoSynth, quality, TEST_TEXTS, councilVoiceCopyGuard, g2p } = require("../buzzardNative/speech/nativeTts");
const { thinkSpeak } = require("../buzzardNative/speech/thinkSpeak");
const { transformerDispatch } = require("../buzzardNative/thinking/transformerDispatch");
const { nativeAiStatus, engineHealth } = require("../buzzardNative/platform/nativeStatus");
const { matrix } = require("../buzzardNative/platform/engineStatus");
const { runAll } = require("../buzzardNative/platform/scenarios");
const { runTextMeeting } = require("../buzzardNative/platform/councilMeeting");
const { runPhase8Thinking } = require("../buzzardNative/thinking/phase8Thinking");
const { runPhase9 } = require("../buzzardNative/thinking/phase9Closure");
const { runLocalTurn } = require("../buzzardNative/platform/localChain");
const { runPhase10 } = require("../buzzardNative/thinking/phase10Closure");
const { runPhase10ThinkingEval } = require("../buzzardNative/thinking/phase10Eval");
const { runPhase11 } = require("../buzzardNative/thinking/phase11Run");
const { runPhase12 } = require("../buzzardNative/thinking/phase12Run");
const { runPhase13 } = require("../buzzardNative/thinking/phase13Run");
const { runPhase14 } = require("../buzzardNative/thinking/phase14Run");
const { runPhase15 } = require("../buzzardNative/thinking/phase15Run");
const { runPhase16 } = require("../buzzardNative/thinking/phase16Run");
const { runPhase17 } = require("../buzzardNative/thinking/phase17Run");
const { runPhase18 } = require("../buzzardNative/thinking/phase18Run");
const { list: humanRemainingList } = require("../buzzardNative/platform/humanRemaining");
const { board: closeoutBoard } = require("../buzzardNative/platform/closeoutBoard");
const { runFoundation } = require("../buzzardNative/core/foundation");
const { runCouncil10 } = require("../buzzardNative/core/council10");
const { runCouncil17 } = require("../buzzardNative/core/council17");
const { registry } = require("../buzzardNative/thinking/datasetRegistry");
const { createThinkingEngine } = require("../buzzardNative/engines/thinking");
const { costHorizon } = require("../buzzardNative/thinking/costHorizon");
const { probeHardware } = require("../buzzardNative/thinking/hardwareProbe");
const { hardwareScenarios } = require("../buzzardNative/hardwareScenarios");
const { keyRecoveryProcedure } = require("../buzzardNative/keyRecovery");
const { supervisorStatus } = require("../buzzardNative/supervisor");
const { costModel } = require("../buzzardNative/costModel");
const { dependencyInventory } = require("../buzzardNative/dependencyInventory");
const { evaluateEgress } = require("../security/egressPolicy");

const REPLIES = Object.freeze({
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  NEEDS_RESEARCH: "NEEDS_RESEARCH",
  NEEDS_APPROVAL: "NEEDS_APPROVAL",
  COMPLETED_WITH_EVIDENCE: "COMPLETED_WITH_EVIDENCE",
  FAILED: "FAILED",
});

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
  "CLONE_OFFICIAL_VOICE",
  "PURCHASE_ANYTHING",
  "DOWNLOAD_OR_HOST_MODELS",
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
  const lab = createLab();
  const xfLab = createTransformerLab();

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
    let reply = REPLIES.IN_PROGRESS;
    if (status === "BLOCKED") reply = REPLIES.BLOCKED;
    else if (status === "TESTED" || status === "CODE_READY") reply = REPLIES.COMPLETED_WITH_EVIDENCE;
    else if (blockedReason) reply = REPLIES.BLOCKED;
    return {
      ok: true,
      report,
      reply,
      liveVerified: false,
      testedIsNotLive: true,
    };
  }

  function review(payload) {
    const analysis = analyze(payload);
    return { ok: true, reply: REPLIES.COMPLETED_WITH_EVIDENCE, kind: "review", analysis, live: false };
  }

  function architecture() {
    const native = createNativeRuntime();
    native.initializeAll();
    return {
      ok: true,
      reply: REPLIES.COMPLETED_WITH_EVIDENCE,
      motors: catalog(),
      nativeRuntime: native.health(),
      hardware: hardwareScenarios(),
      hardwareProbe: probeHardware(),
      costHorizon: costHorizon(),
      keyRecovery: keyRecoveryProcedure(),
      supervisor: supervisorStatus(),
      cost: costModel(),
      dependencies: dependencyInventory(),
      liveVerified: false,
    };
  }

  function securityReview() {
    const egress = evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } });
    return {
      ok: true,
      reply: REPLIES.COMPLETED_WITH_EVIDENCE,
      egressDefaultDeny: egress.allowed === false,
      gates: HUMAN_GATES,
      esatSoleDefense: false,
      liveVerified: false,
    };
  }

  function recordTest({ taskId, result } = {}) {
    return reportToPusat({
      taskId,
      kind: "test",
      status: "TESTED",
      testResult: result || "unknown",
      body: { testedIsNotLive: true },
    });
  }

  function statusBoard() {
    return {
      ok: true,
      identity: profile(),
      motors: catalog(),
      supervisor: supervisorStatus(),
      voice: voiceAvatar(),
      tasks: durable ? durable.listTasks() : [],
      liveVerified: false,
      alwaysOn: false,
    };
  }

  function remember({ section, key, value, source } = {}) {
    if (!durable) return { ok: false, code: "NO_DURABLE_STORE" };
    return durable.putPartitioned({ section, key, value, source });
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
      voice: voice.voice,
      sttStatus: voice.sttStatus,
      ttsStatus: voice.ttsStatus,
      phone: voice.phone,
      liveNetwork: voice.liveNetwork,
      providers: providerAdapters(),
      codeStatus: "CODE_READY",
      status: "NOT_CONFIGURED",
      reachable: false,
      codeReadyIsLive: false,
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

  function trainPlan() {
    lab.registerDataset();
    return {
      ok: true,
      reply: REPLIES.NEEDS_APPROVAL,
      gpu: false,
      downloadedWeights: false,
      data: "BUZZARD_ORIGINAL synthetic public only",
      hardware: probeHardware(),
      costs: costHorizon(),
      production: false,
    };
  }

  function modelStatus() {
    return {
      ok: true,
      jobs: lab.jobs,
      models: lab.models.map((m) => ({ id: m.id, version: m.version, production: false, generalPurpose: false })),
      promote: lab.promote(),
    };
  }

  function runToyTrain(opts) {
    lab.registerDataset();
    return lab.trainToy(opts);
  }

  function transformerStatus() {
    return xfLab.status();
  }

  function modelEvaluate() {
    return xfLab.evaluate();
  }

  function tokenizerTest() {
    return xfLab.tokenizerTest();
  }

  function trainTransformerRun(opts = {}, actorId = "sinan_bey") {
    return xfLab.trainRun({ ...opts, actorId });
  }

  function modelCompare(opts) {
    return xfLab.compareLinear(opts);
  }

  function hardwareReport() {
    return xfLab.hardwareReport();
  }

  function phase5Report() {
    const p = "docs/council/SINAN_BEY_NATIVE_AI_PHASE5_REPORT.md";
    return {
      ok: fs.existsSync(p),
      path: p,
      production: false,
      reasoning: xfLab.last ? runReasoning(xfLab) : { skipped: true },
    };
  }

  function phase6Status() {
    return {
      thinking: { ...transformerDispatch(), proto: xfLab.status() },
      voice: analyzeOfficialVoice({ actorId: "sinan_bey" }),
      tts: { liveTts: false, officialVoice: false, voiceId: VOICE_ID },
      liveMeeting: false,
      production: false,
    };
  }

  function reasoningTest() {
    if (!xfLab.last) xfLab.trainRun({ epochs: 1, actorId: "sinan_bey" });
    return { phase5: runReasoning(xfLab), phase6: runReasoningPhase6(xfLab), reasoningClaim: false };
  }

  function voiceAnalyze(actorId = "sinan_bey") {
    const result = analyzeOfficialVoice({ actorId });
    if (result.profile && ["sinan_bey", "pusat"].includes(actorId)) {
      writeProfile(result.profile, { actorId });
    }
    return result;
  }

  function voiceProfile() {
    return analyzeOfficialVoice({ actorId: "sinan_bey" }).profile;
  }

  function voiceTest() {
    return Object.fromEntries(Object.entries(TEST_TEXTS).map(([lang, text]) => [lang, protoSynth({ text, lang })]));
  }

  function voiceGenerate({ text, lang, actorId = "sinan_bey" } = {}) {
    if (!["sinan_bey", "pusat"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    return protoSynth({ text, lang });
  }

  function voiceQuality() {
    return quality();
  }

  function voiceVersion() {
    return { voiceId: VOICE_ID, version: 1, copy: councilVoiceCopyGuard({ fromId: "sinan_bey", toId: "pusat" }) };
  }

  function thinkThenSpeak(text) {
    const thinking = createThinkingEngine();
    thinking.initialize();
    return thinkSpeak({ thinking, text, actorId: ID });
  }

  function nativeStatus() {
    return nativeAiStatus();
  }

  function nativeEngineStatus() {
    return matrix();
  }

  function nativeEngineHealth() {
    return engineHealth();
  }

  function nativeEngineTest() {
    return runAll();
  }

  function nativeEngineReport() {
    return {
      engines: matrix(),
      scenarios: runAll(),
      meeting: runTextMeeting(),
      liveVerified: false,
    };
  }

  function phase7Report() {
    const p = "docs/council/BUZZARD_NATIVE_AI_PHASE7_MASTER_REPORT.md";
    return { ok: fs.existsSync(p), path: p, production: false };
  }

  function phase8Report() {
    const p = "docs/council/BUZZARD_NATIVE_AI_PHASE8_MASTER_REPORT.md";
    return {
      ok: fs.existsSync(p),
      path: p,
      production: false,
      data: registry(),
      thinking: transformerDispatch(),
    };
  }

  function phase8Thinking(opts) {
    return runPhase8Thinking(opts);
  }

  function phase9Report(opts) {
    const actor = (opts && opts.actorId) || ID;
    const p = "docs/council/BUZZARD_NATIVE_AI_PHASE9_MASTER_REPORT.md";
    return { ok: fs.existsSync(p), path: p, production: false, data: runPhase9({ actorId: actor }) };
  }

  function phase10Report(opts) {
    const actor = (opts && opts.actorId) || ID;
    const p = "docs/council/BUZZARD_NATIVE_AI_PHASE10_MASTER_REPORT.md";
    return { ok: fs.existsSync(p), path: p, production: false, data: runPhase10({ actorId: actor }) };
  }

  function phase10Eval(opts) {
    const actor = (opts && opts.actorId) || ID;
    if (!["sinan_bey", "pusat", "esat_bey"].includes(actor)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    return runPhase10ThinkingEval();
  }

  function phaseNReport(n, runner) {
    return (opts) => {
      const actor = (opts && opts.actorId) || ID;
      const p = `docs/council/BUZZARD_NATIVE_AI_PHASE${n}_MASTER_REPORT.md`;
      return { ok: fs.existsSync(p), path: p, production: false, data: runner ? runner({ actorId: actor }) : { pending: true } };
    };
  }
  const phase11Report = phaseNReport(11, runPhase11);
  const phase12Report = phaseNReport(12, runPhase12);
  const phase13Report = phaseNReport(13, runPhase13);
  const phase14Report = phaseNReport(14, runPhase14);
  const phase15Report = phaseNReport(15, runPhase15);
  const phase16Report = phaseNReport(16, runPhase16);
  const phase17Report = phaseNReport(17, runPhase17);
  const phase18Report = phaseNReport(18, runPhase18);

  function humanRemaining(opts) {
    const actor = (opts && opts.actorId) || ID;
    if (!["sinan_bey", "pusat", "esat_bey"].includes(actor)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    return humanRemainingList();
  }

  function closeout(opts) {
    return closeoutBoard({ actorId: (opts && opts.actorId) || ID });
  }

  function multiAgentFoundation(opts) {
    return runFoundation({ actorId: (opts && opts.actorId) || ID });
  }

  function tenAgentCouncil(opts) {
    return runCouncil10({ actorId: (opts && opts.actorId) || ID });
  }

  function seventeenAgentCouncil(opts) {
    return runCouncil17({ actorId: (opts && opts.actorId) || ID });
  }

  function phase9Chain(opts) {
    const actorId = (opts && opts.actorId) || ID;
    if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) {
      return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    }
    return runLocalTurn({ actorId, text: (opts && opts.text) || "status then report" });
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
    review,
    architecture,
    securityReview,
    recordTest,
    statusBoard,
    remember,
    trainPlan,
    modelStatus,
    runToyTrain,
    transformerStatus,
    modelEvaluate,
    tokenizerTest,
    trainTransformerRun,
    modelCompare,
    hardwareReport,
    phase5Report,
    phase6Status,
    reasoningTest,
    voiceAnalyze,
    voiceProfile,
    voiceTest,
    voiceGenerate,
    voiceQuality,
    voiceVersion,
    thinkThenSpeak,
    nativeStatus,
    nativeEngineStatus,
    nativeEngineHealth,
    nativeEngineTest,
    nativeEngineReport,
    phase7Report,
    phase8Report,
    phase8Thinking,
    phase9Report,
    phase9Chain,
    phase10Report,
    phase10Eval,
    phase11Report,
    phase12Report,
    phase13Report,
    phase14Report,
    phase15Report,
    phase16Report,
    phase17Report,
    phase18Report,
    humanRemaining,
    closeout,
    multiAgentFoundation,
    tenAgentCouncil,
    seventeenAgentCouncil,
    g2p,
    approvals,
    durable,
    REPLIES,
  };
}

module.exports = { createSinanBeyAgent, HUMAN_GATES, DOMAIN_PATHS, ID, REPLIES };
