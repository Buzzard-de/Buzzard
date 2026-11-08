import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const { runPhase10ThinkingEval } = require("../lib/buzzardNative/thinking/phase10Eval.js");
const { evaluateAll } = require("../lib/buzzardNative/thinking/ruleReasoner.js");
const { infer, DEFAULT_RULES } = require("../lib/buzzardNative/thinking/inferenceEngine.js");
const { loopback } = require("../lib/buzzardNative/hearing/toneCodec.js");
const { pipeline } = require("../lib/buzzardNative/hearing/sttPipeline.js");
const { synthesizeSafe, architecture } = require("../lib/buzzardNative/speech/ttsArchitecture.js");
const { analyzeOfficialVoice } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const { renderTextPng, ocrBitmap } = require("../lib/buzzardNative/vision/bitmapFont.js");
const { syntheticTwoBlobs } = require("../lib/buzzardNative/vision/blobDetect.js");
const { createCharacterStore } = require("../lib/buzzardNative/memory/characterStore.js");
const { schedule } = require("../lib/buzzardNative/motion/visemeSchedule.js");
const { createSessionHub } = require("../lib/buzzardNative/realtime/nativeSession.js");
const { runPhase10 } = require("../lib/buzzardNative/thinking/phase10Closure.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { wavTone } = require("../lib/buzzardNative/speech/wavTone.js");
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");

describe("Phase 10 capability engineering", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("keeps the official voice hash and clone gate", () => {
    const buf = readFileSync("public/council/sinan-bey-official-voice-v1.m4a");
    expect(createHash("sha256").update(buf).digest("hex")).toBe(
      "16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d",
    );
    const v = analyzeOfficialVoice({ actorId: "sinan_bey" });
    expect(v.profile.cloneAuthorized).toBe(false);
    expect(v.ttsReady).toBe(false);
    expect(architecture().cloneAuthorized).toBe(false);
  });

  it("keeps Phase 9 closed-world 14/14 and adds structured inference", () => {
    const p9 = evaluateAll();
    expect(p9.passed).toBe(14);
    expect(p9.generalIntelligence).toBe(false);
    const ev = runPhase10ThinkingEval();
    expect(ev.llmCompleted).toBe(false);
    expect(ev.kind).toBe("RULE_BASED");
    expect(ev.passed).toBe(ev.total);
    expect(infer({ facts: { rain: true }, rules: DEFAULT_RULES }).facts.slip_risk).toBe("elevated");
  });

  it("tone-codec STT is not general STT; corrupt files fail; loopback has WER", () => {
    const tr = loopback({ text: "merhaba", lang: "tr" });
    const de = loopback({ text: "hallo", lang: "de" });
    const en = loopback({ text: "hello", lang: "en" });
    expect(tr.generalStt).toBe(false);
    expect(tr.wer).toBeLessThan(0.25);
    expect(de.wer).toBeLessThan(0.25);
    expect(en.wer).toBeLessThan(0.25);
    expect(pipeline(Buffer.from("not-audio")).ok).toBe(false);
    const rt = createNativeRuntime();
    rt.initializeAll();
    const human = rt.engines.get("hearing").execute({ op: "transcribe" });
    expect(human.code).toBe("NOT_IMPLEMENTED");
  });

  it("proto TTS writes a valid wav without official clone", () => {
    const s = synthesizeSafe({ text: "rapor", lang: "tr" });
    expect(s.wavValid).toBe(true);
    expect(s.officialVoiceUsed).toBe(false);
    expect(s.cloneAuthorized).toBe(false);
  });

  it("bitmap OCR and blob detect work on synthetic images only", () => {
    const { png } = renderTextPng("SINAN");
    expect(ocrBitmap(png).text).toBe("SINAN");
    expect(syntheticTwoBlobs().count).toBe(2);
    const rt = createNativeRuntime();
    rt.initializeAll();
    expect(rt.engines.get("vision").execute({ op: "understand" }).code).toBe("NOT_IMPLEMENTED");
  });

  it("memory isolation, snapshot restore, unauthorized session", () => {
    const mem = createCharacterStore();
    expect(mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", section: "decisions", key: "k", value: 1 }).ok).toBe(true);
    expect(mem.get({ actorId: "pusat", ownerId: "sinan_bey", section: "decisions", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    mem.backupLocal();
    mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", section: "decisions", key: "k", value: 2 });
    mem.restoreLocal();
    expect(mem.get({ actorId: "sinan_bey", ownerId: "sinan_bey", section: "decisions", key: "k" }).decoded.value).toBe(1);
    const hub = createSessionHub();
    expect(hub.open({ actorId: "stranger" }).code).toBe("UNAUTHORIZED_ACTOR");
    const ses = hub.open({ actorId: "sinan_bey", participants: ["pusat"] });
    expect(hub.send({ sessionId: ses.sessionId, actorId: "sinan_bey", bytes: wavTone({ hz: 170, ms: 20 }) }).ok).toBe(true);
    expect(hub.send({ sessionId: ses.sessionId, actorId: "dogu_bey", bytes: Buffer.alloc(4) }).code).toBe(
      "UNAUTHORIZED_PARTICIPANT",
    );
    expect(schedule(["a", "e"]).lipSyncPass).toBe(false);
  });

  it("security egress deny and Phase 10 closure does not claim live", () => {
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed).toBe(false);
    const p = runPhase10();
    expect(p.liveVerified).toBe(false);
    expect(p.tts.cloneAuthorized).toBe(false);
    expect(p.stt.generalStt).toBe(false);
    expect(p.transformer.code).toBe("NOT_IMPLEMENTED");
    expect(p.alwaysOn.alwaysOnHost).toBe("NOT_IMPLEMENTED");
    expect(p.egress).toBe(false);
    expect(matrix().hearing.stt).toBe("NOT_IMPLEMENTED");
    expect(matrix().speech.officialTts).toBe("NOT_IMPLEMENTED");
    expect(existsSync("docs/council/SINAN_BEY_NATIVE_AI_CLOSEOUT_REPORT.md")).toBe(true);
  });

  it("Pusat Phase 10 actions", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const ev = pusat.executeReadOnly("SINAN_PHASE10_EVAL", {}, { actorId: "sinan_bey" });
    expect(ev.data.passed).toBe(ev.data.total);
    expect(pusat.executeReadOnly("SINAN_PHASE10_EVAL", {}, { actorId: "stranger" }).data.code).toBe("UNAUTHORIZED_ACTOR");
    const rep = pusat.executeReadOnly("SINAN_PHASE10_REPORT", {}, { actorId: "pusat" });
    expect(rep.data.path).toMatch(/PHASE10/);
  });
});
