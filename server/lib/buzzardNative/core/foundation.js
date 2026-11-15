const { AGENTS, ids, assignVoice, assignAvatar, impersonate, verifySinanAssets, getAgent } = require("./identityRegistry");
const { forAgent, canUse } = require("./capabilityRegistry");
const { check, selfElevate, esatDisableSelf } = require("./permissionEngine");
const { createMultiMemory } = require("./multiMemory");
const { createAgentBus } = require("./agentBus");
const { think } = require("./sharedThinking");
const { speak } = require("./sharedSpeech");
const { openSession, listen, crossListen } = require("./sharedHearing");
const { analyze } = require("./sharedVision");
const { bodyOf, mixAvatars } = require("./bodyMotion");
const { createRouter } = require("./taskRouter");
const { openMeeting } = require("./councilSession");
const { createAudit } = require("./audit");
const { runLoad } = require("./loadProbe");
const { createNativeRuntime } = require("../runtimeCore");
const { verifyOfficialFile, cloneAttempt } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { inspectFile } = require("../hearing/humanStt");
const { ocrLanguages } = require("../vision/imageOps");

function runFoundation({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const mem = createMultiMemory();
  mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "decision", key: "d1", value: "local" });
  mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "decision", key: "d1", value: "v2" });
  const restored = mem.restore({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "decision", key: "d1", version: 1 });
  const tamper = mem.tamperDetect({ ownerId: "sinan_bey", type: "decision", key: "d1" });
  const stolen = mem.get({ actorId: "amelia", ownerId: "sinan_bey", type: "decision", key: "d1" });
  const mira = mem.put({ actorId: "mira", ownerId: "mira", type: "personal", key: "p", value: 1 });
  const miraStolen = mem.get({ actorId: "amelia", ownerId: "mira", type: "personal", key: "p" });
  const pusatPeek = mem.get({ actorId: "pusat", ownerId: "sinan_bey", type: "decision", key: "d1" });
  const bus = createAgentBus();
  const msg = bus.send({ sender: "sinan_bey", receiver: "esat_bey", type: "report", body: "ok" });
  const badMsg = bus.send({ sender: "stranger", receiver: "sinan_bey", type: "x" });
  const priv = bus.send({ sender: "sinan_bey", receiver: "amelia", type: "note", permission_scope: "personal_memory" });
  const router = createRouter();
  const task = router.create({ title: "research payments locally", fromId: "pusat" });
  router.assign({ taskId: task.task.id, agentId: "dogu_bey", fromId: "pusat" });
  router.assign({ taskId: task.task.id, agentId: "sinan_bey", fromId: "pusat" });
  router.assign({ taskId: task.task.id, agentId: "esat_bey", fromId: "pusat" });
  const ran = router.runAssigned(task.task.id);
  const snap = router.snapshot();
  const router2 = createRouter({ seed: snap });
  const persistOk = router2.get(task.task.id).state === ran.task.state;
  const hearSess = openSession({ agentId: "sinan_bey" });
  const hearOther = crossListen({ sessionId: hearSess.sessionId, otherAgentId: "amelia" });
  const audit = createAudit();
  audit.log("task_assigned", { agentId: "pusat", taskId: task.task.id, password: "nope" });
  const rt = createNativeRuntime();
  rt.initializeAll();
  rt.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "crash" } });
  const crash = rt.runNext();
  rt.enqueue({ engineId: "hearing", actorId: "esat_bey", payload: { op: "vad", pcm: Buffer.alloc(16) } });
  const hear = rt.runNext();
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    productionReady: false,
    singlePercentComplete: null,
    registered: ids().length,
    identities: AGENTS.map((a) => a.agent_id),
    assets: verifySinanAssets(),
    official: verifyOfficialFile(),
    clone: cloneAttempt({ requested: true }),
    voiceCopy: assignVoice({ fromId: "sinan_bey", toId: "amelia" }),
    avatarCopy: assignAvatar({ fromId: "amelia", toId: "mira" }),
    memory: { stolen: stolen.code, miraOk: mira.ok, miraStolen: miraStolen.code, pusatPeek: pusatPeek.code },
    bus: { msg: msg.ok, bad: badMsg.code, priv: priv.code },
    orchestrator: { state: ran.task.state, completed: ran.completed, reports: ran.task.reports.length },
    meeting: openMeeting({ present: ["pusat", "sinan_bey", "esat_bey", "dogu_bey"] }),
    perms: {
      deploy: check("sinan_bey", "DEPLOY"),
      esatPolicy: esatDisableSelf(),
      pusatPay: check("pusat", "PAYMENT_ACTIVATE"),
      miraExport: check("mira", "DATA_EXPORT"),
      elevate: selfElevate("leon", "GIT_PUSH"),
    },
    isolationCrash: { thinkingCrashed: crash.result?.crashed === true, hearingOk: hear.ok },
    persistOk,
    restore: restored.value,
    tamperDetected: tamper.detected,
    pusatPeek: pusatPeek.code,
    impersonate: impersonate({ actorId: "mira", asId: "amelia" }),
    mixAvatars: mixAvatars("amelia", "mira"),
    hearing: { listen: listen({ sessionId: hearSess.sessionId, path: "public/council/sinan-bey-official-voice-v1.m4a" }), hearOther: hearOther.code },
    vision: { amelia: analyze({ agentId: "amelia", op: "ocr" }), sinanUnderstand: analyze({ agentId: "sinan_bey", op: "understand" }) },
    body: { sinan: bodyOf("sinan_bey"), amelia: bodyOf("amelia") },
    completeDenied: router.forceComplete(),
    thinkingShared: {
      sinan: think({ agentId: "sinan_bey", facts: { ask_expertise: true } }).expertise,
      esat: think({ agentId: "esat_bey", facts: { ask_expertise: true } }).expertise,
    },
    speech: {
      sinan: speak({ agentId: "sinan_bey", text: "a" }).voiceStatus,
      amelia: speak({ agentId: "amelia", text: "a" }).voiceStatus,
    },
    hearingHumanStt: inspectFile("public/council/sinan-bey-official-voice-v1.m4a").transcribe,
    visionUnderstand: "NOT_IMPLEMENTED",
    ocrTemplate: ocrLanguages(),
    auditRedacted: audit.all()[0].payload.password === "[REDACTED]",
    load: runLoad(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
    capabilities: Object.fromEntries(ids().map((id) => [id, forAgent(id)])),
    canSinanThink: canUse("sinan_bey", "thinking"),
    getAgent: getAgent("adrian").role,
  };
}

module.exports = { runFoundation };
