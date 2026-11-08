const { createNativeRuntime } = require("../runtimeCore");
const { thinkSpeak } = require("../speech/thinkSpeak");
const { analyzeOfficialVoice } = require("../speech/voiceIdentity");
const { runTextMeeting } = require("./councilMeeting");
const { evaluateEgress } = require("../../security/egressPolicy");
const fs = require("fs");

function scenarioA() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "transcribe" } });
  const stt = rt.runNext();
  const thinking = rt.engines.get("thinking");
  const pipe = thinkSpeak({ thinking, text: "report.status", actorId: "sinan_bey" });
  return {
    id: "A_voice_qa",
    mock: false,
    stt: stt.result.code,
    officialTts: pipe.officialVoice,
    live: false,
    pass: false,
    note: "STT NOT_IMPLEMENTED; proto tone is not Sinan voice",
  };
}

function scenarioB() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  const png = fs.readFileSync("public/council/sinan-bey.png");
  rt.enqueue({ engineId: "vision", actorId: "sinan_bey", payload: { op: "sniff", bytes: png } });
  const sniff = rt.runNext();
  rt.enqueue({ engineId: "vision", actorId: "sinan_bey", payload: { op: "understand" } });
  const und = rt.runNext();
  return {
    id: "B_image",
    sniffOk: sniff.ok,
    understand: und.result.code,
    pass: false,
    note: "decode/sniff is not visual understanding",
  };
}

function scenarioC() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  rt.enqueue({
    engineId: "memory",
    actorId: "sinan_bey",
    payload: { op: "put", ownerId: "sinan_bey", actorId: "sinan_bey", key: "task", value: "review", section: "D" },
  });
  const mem = rt.runNext();
  rt.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "plan", goal: "review then report" } });
  const think = rt.runNext();
  return { id: "C_sinan_task", memoryOk: mem.ok, thinkOk: think.ok, live: false };
}

function scenarioD() {
  return { id: "D_council", ...runTextMeeting({}), liveVoice: false };
}

function scenarioE() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  rt.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "crash" } });
  const crash = rt.runNext();
  rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "vad", pcm: Buffer.alloc(16) } });
  const hear = rt.runNext();
  return { id: "E_isolation", thinkingCrashed: crash.result.crashed === true, hearingOk: hear.ok };
}

function scenarioF() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  const denied = rt.enqueue({ engineId: "thinking", actorId: "stranger", payload: { op: "plan" } });
  const egress = evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } });
  const voice = analyzeOfficialVoice({ actorId: "stranger" });
  return {
    id: "F_unauthorized",
    enqueue: denied.code,
    egressAllowed: egress.allowed,
    voice: voice.code,
    pass: denied.code === "UNAUTHORIZED_ACTOR" && egress.allowed === false,
  };
}

function runAll() {
  return { A: scenarioA(), B: scenarioB(), C: scenarioC(), D: scenarioD(), E: scenarioE(), F: scenarioF() };
}

module.exports = { scenarioA, scenarioB, scenarioC, scenarioD, scenarioE, scenarioF, runAll };
