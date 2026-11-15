const { runPhase10ThinkingEval } = require("./phase10Eval");
const { evaluateAll } = require("./ruleReasoner");
const { evalLanguages } = require("../hearing/sttPipeline");
const { architecture, synthesizeSafe } = require("../speech/ttsArchitecture");
const { renderTextPng, ocrBitmap } = require("../vision/bitmapFont");
const { syntheticTwoBlobs } = require("../vision/blobDetect");
const { createCharacterStore } = require("../memory/characterStore");
const { schedule } = require("../motion/visemeSchedule");
const { createSessionHub } = require("../realtime/nativeSession");
const { design, createSupervisorRuntime } = require("../platform/alwaysOn");
const { analyzeOfficialVoice } = require("../speech/voiceIdentity");
const { transformerDispatch } = require("./transformerDispatch");
const { matrix } = require("../platform/engineStatus");
const { wavTone } = require("../speech/wavTone");
const { g2p } = require("../speech/nativeTts");
const { evaluateEgress } = require("../../security/egressPolicy");

function runPhase10({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) {
    return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  }
  const p9 = evaluateAll();
  const think = runPhase10ThinkingEval();
  const stt = evalLanguages();
  const tts = synthesizeSafe({ text: "rapor", lang: "tr", actorId });
  const arch = architecture();
  const rendered = renderTextPng("SINAN");
  const ocr = ocrBitmap(rendered.png);
  const blobs = syntheticTwoBlobs();
  const mem = createCharacterStore();
  mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", section: "decisions", key: "p10", value: "phase10" });
  const stolen = mem.get({ actorId: "pusat", ownerId: "sinan_bey", section: "decisions", key: "p10" });
  mem.backupLocal();
  const vis = schedule(g2p("merhaba", "tr").phonemes);
  const hub = createSessionHub();
  const ses = hub.open({ actorId: "sinan_bey", participants: ["pusat"] });
  const pkt = hub.send({ sessionId: ses.sessionId, actorId: "sinan_bey", bytes: wavTone({ hz: 170.8, ms: 40 }) });
  const unauth = hub.open({ actorId: "stranger", participants: [] });
  const always = design();
  const sup = createSupervisorRuntime();
  sup.start();
  sup.crash();
  const voice = analyzeOfficialVoice({ actorId: "sinan_bey" });
  return {
    ok: true,
    liveVerified: false,
    productionReady: false,
    singlePercentComplete: null,
    phase9Rules: { passed: p9.passed, total: p9.total, generalIntelligence: false },
    thinking: think,
    stt: { meanWer: stt.meanWer, generalStt: false, rows: stt.rows.map((r) => ({ lang: r.lang, wer: r.wer })) },
    tts: { ok: tts.ok, officialVoiceUsed: tts.officialVoiceUsed, cloneAuthorized: false, wavValid: tts.wavValid },
    ttsArchitecture: arch,
    vision: { ocr: ocr.text, ocrGeneral: false, blobs: blobs.count, understand: "NOT_IMPLEMENTED" },
    memory: { isolationDenied: stolen.code === "MEMORY_ISOLATION_DENIED", offsite: false },
    motion: { visemes: vis.events.length, lipSyncPass: vis.lipSyncPass },
    realtime: { session: ses.ok, packet: pkt.ok, unauth: unauth.code, liveCommunicationPass: false },
    alwaysOn: always,
    supervisor: sup.status(),
    voice: { code: voice.code, ttsReady: voice.ttsReady, cloneAuthorized: voice.profile.cloneAuthorized, meanF0: voice.profile.f0Hz.mean },
    transformer: transformerDispatch(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
    engines: matrix(),
  };
}

module.exports = { runPhase10 };
