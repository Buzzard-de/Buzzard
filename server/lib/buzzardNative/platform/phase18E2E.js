const { createNativeRuntime } = require("../runtimeCore");
const { inspectFile } = require("../hearing/humanStt");
const { loopback } = require("../hearing/toneCodec");
const { solve } = require("../thinking/solve");
const { infer, DEFAULT_RULES } = require("../thinking/inferenceEngine");
const { protoSynth } = require("../speech/nativeTts");
const { speechSync } = require("../motion/expression");
const { duplexOnce } = require("../realtime/duplex");
const { cloneAttempt } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { wavTone } = require("../speech/wavTone");
const { validateImage } = require("../vision/imageValidate");
const { lab32110 } = require("../memory/localCopies");

function step(id, real, detail) {
  return { id, real, ...detail };
}

function runE2E() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  const wav = wavTone({ hz: 170.8, ms: 80 });
  const hear = inspectFile(wav);
  rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "vad", pcm: wav.slice(44) } });
  const vad = rt.runNext();
  rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "transcribe" } });
  const stt = rt.runNext();
  const tone = loopback({ text: "merhaba", lang: "tr" });
  const think = solve({ problem: "wet floor", facts: { rain: true } });
  rt.enqueue({
    engineId: "memory",
    actorId: "sinan_bey",
    payload: { op: "put", ownerId: "sinan_bey", actorId: "sinan_bey", key: "e2e", value: "ok", section: "D" },
  });
  const mem = rt.runNext();
  const answer = infer({ facts: { rain: true }, rules: DEFAULT_RULES });
  const speech = protoSynth({ text: "zemin islak", lang: "tr" });
  const body = speechSync("zemin", "tr");
  const media = duplexOnce();
  const clone = cloneAttempt({ requested: true });
  const egress = evaluateEgress({ destinationUrl: "https://api.openai.com/v1" });
  const unauth = rt.enqueue({ engineId: "thinking", actorId: "stranger", payload: { op: "plan" } });
  return {
    steps: [
      step("1_user_audio", true, { note: "proto_wav_not_human_mic", format: hear.format }),
      step("2_vad", vad.ok, { voiceLikely: vad.result?.voiceLikely, stt: false }),
      step("3_human_stt", false, { code: stt.result?.code, toneCodecWer: tone.wer, generalStt: false }),
      step("4_thinking", think.ok, { kind: think.kind, slip: think.inference.facts.slip_risk }),
      step("5_memory", mem.ok, { stored: mem.result?.stored }),
      step("6_answer", answer.ok, { ground_wet: answer.facts.ground_wet, kind: "RULE_BASED" }),
      step("7_speech", speech.ok, { officialVoiceUsed: speech.officialVoiceUsed }),
      step("8_body", body.ok, { lipSyncPass: body.lipSyncPass, body3d: false }),
      step("9_realtime", media.payloadMatch, { liveMedia: media.liveMedia }),
      step("10_pusat_record", true, { note: "in_process_engine_log" }),
      step("11_unauthorized", unauth.code === "UNAUTHORIZED_ACTOR", { code: unauth.code }),
      step("12_security", egress.allowed === false && clone.code === "CLONE_DENIED", { egress: egress.allowed, clone: clone.code }),
    ],
  };
}

function resilience() {
  const rt = createNativeRuntime();
  rt.initializeAll();
  rt.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "crash" } });
  const crash = rt.runNext();
  rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "vad", pcm: Buffer.alloc(16) } });
  const hear = rt.runNext();
  return {
    thinkingCrashed: crash.result?.crashed === true,
    hearingAfterCrash: hear.ok,
    badAudio: inspectFile(Buffer.from("nope")).ok === false,
    badImage: validateImage(Buffer.from("nope")).ok === false,
    copiesTamper: lab32110().tamperDetected,
    egress: evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed === false,
  };
}

module.exports = { runE2E, resilience };
