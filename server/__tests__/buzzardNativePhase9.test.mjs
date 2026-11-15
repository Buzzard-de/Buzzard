import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { evaluateAll, answer } = require("../lib/buzzardNative/thinking/ruleReasoner.js");
const { runLocalTurn } = require("../lib/buzzardNative/platform/localChain.js");
const { runPhase9 } = require("../lib/buzzardNative/thinking/phase9Closure.js");
const { protoSynth } = require("../lib/buzzardNative/speech/nativeTts.js");
const { stats } = require("../lib/buzzardNative/vision/imageStats.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");
const { analyzeOfficialVoice } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");

describe("Phase 9 local stack closure", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("closes the rule reasoner without claiming general intelligence", () => {
    const ev = evaluateAll();
    expect(ev.passed).toBe(ev.total);
    expect(ev.generalIntelligence).toBe(false);
    expect(answer("production transformer status").value).toBe("NOT_IMPLEMENTED");
  });

  it("runs the local think-speak-body chain without official TTS or STT", () => {
    const t = runLocalTurn({ text: "status then report" });
    expect(t.ok).toBe(true);
    expect(t.officialTts).toBe(false);
    expect(t.hearing.stt).toBe(false);
    expect(t.speech.officialVoiceUsed).toBe(false);
    expect(t.speech.hz).toBeCloseTo(170.8, 0);
    expect(t.body.lipSync).toBe(false);
    expect(t.vision.understanding).toBe(false);
  });

  it("keeps proto synth as measured-F0 tone, not a clone", () => {
    const s = protoSynth({ text: "Merhaba", lang: "tr" });
    expect(s.officialVoiceUsed).toBe(false);
    expect(s.clone).toBe(false);
    expect(s.hz).toBeCloseTo(170.8, 0);
    expect(s.kind).toMatch(/NOT_OFFICIAL/);
    expect(s.kind).toMatch(/NOT_CLONE/);
  });

  it("reads avatar geometry without understanding", () => {
    const png = readFileSync("public/council/sinan-bey.png");
    const g = stats(png);
    expect(g.ok).toBe(true);
    expect(g.format).toBe("png");
    expect(g.width).toBeGreaterThan(100);
    expect(g.understanding).toBe(false);
  });

  it("does not mark production AI live", () => {
    const p = runPhase9();
    expect(p.liveVerified).toBe(false);
    expect(p.productionReady).toBe(false);
    expect(p.singlePercentComplete).toBe(null);
    expect(p.localStackClosedPercent).toBe(100);
    expect(p.productAiPercent).toBe(null);
    expect(p.cloneAuthorized).toBe(false);
    expect(p.productionTransformer.code).toBe("NOT_IMPLEMENTED");
    expect(matrix().speech.officialTts).toBe("NOT_IMPLEMENTED");
    expect(matrix().hearing.stt).toBe("NOT_IMPLEMENTED");
    expect(analyzeOfficialVoice({ actorId: "sinan_bey" }).profile.formantsHz.f1).toBeCloseTo(724.7, 0);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
  });

  it("exposes Pusat Phase 9 read-only actions", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const rep = pusat.executeReadOnly("SINAN_PHASE9_REPORT", {}, { actorId: "sinan_bey" });
    expect(rep.ok).toBe(true);
    expect(rep.data.path).toMatch(/PHASE9/);
    expect(rep.data.data.localStackClosedPercent).toBe(100);
    const chain = pusat.executeReadOnly("SINAN_PHASE9_CHAIN", {}, { actorId: "pusat" });
    expect(chain.data.officialTts).toBe(false);
    expect(pusat.executeReadOnly("SINAN_PHASE9_CHAIN", {}, { actorId: "stranger" }).data.code).toBe("UNAUTHORIZED_ACTOR");
  });
});
