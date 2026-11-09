import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createThinkingEngine } = require("../lib/buzzardNative/engines/thinking.js");
const { createSpeechEngine } = require("../lib/buzzardNative/engines/speech.js");
const { createTransformerLab } = require("../lib/buzzardNative/thinking/transformerLab.js");
const { analyzeOfficialVoice } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const { councilVoiceCopyGuard, protoSynth, TEST_TEXTS } = require("../lib/buzzardNative/speech/nativeTts.js");
const { thinkSpeak } = require("../lib/buzzardNative/speech/thinkSpeak.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Phase 6 thinking + official voice", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("keeps full transformer NOT_IMPLEMENTED while the prototype still trains", () => {
    const think = createThinkingEngine();
    think.initialize();
    const full = think.execute({ op: "transformer" });
    expect(full.code).toBe("NOT_IMPLEMENTED");
    expect(full.implemented).toBe(false);
    expect(full.prototype.op).toBe("transformer_proto");
    expect(think.execute({ op: "transformer_proto", epochs: 1 }).ok).toBe(true);
    const lab = createTransformerLab();
    expect(lab.trainRun({ nLayers: 2, actorId: "sinan_bey" }).code).toBe("NOT_IMPLEMENTED");
  });

  it("does not invent Hz and does not treat proto tone as official TTS", () => {
    const analysis = analyzeOfficialVoice({ actorId: "sinan_bey" });
    expect(analysis.inventedHz).toBe(false);
    expect(analysis.ttsReady).toBe(false);
    if (analysis.code === "MISSING_REFERENCE_AUDIO") {
      expect(analysis.profile.f0Hz.mean).toBe(null);
      expect(analysis.profile.status).toBe("BLOCKED");
    } else {
      expect(analysis.ok).toBe(true);
      expect(analysis.profile.f0Hz.unit).toBe("Hz");
      expect(analysis.profile.ttsReady).toBe(false);
    }
    expect(analyzeOfficialVoice({ actorId: "stranger" }).code).toBe("UNAUTHORIZED_ACTOR");
    expect(councilVoiceCopyGuard({ fromId: "sinan_bey", toId: "pusat" }).code).toBe("VOICE_IDENTITY_NOT_COPYABLE");
    const speech = createSpeechEngine();
    speech.initialize();
    expect(speech.execute({ op: "synthesize" }).code).toBe("NOT_IMPLEMENTED");
    const proto = protoSynth({ text: TEST_TEXTS.tr, lang: "tr" });
    expect(proto.officialVoiceUsed).toBe(false);
    expect(proto.kind).toMatch(/NOT_OFFICIAL/);
  });

  it("wires Pusat phase6/voice commands and denies unsafe generate", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const st = pusat.executeReadOnly("SINAN_PHASE6_STATUS", {}, { actorId: "pusat" });
    expect(st.data.liveMeeting).toBe(false);
    expect(st.data.voice.ttsReady || false).toBe(false);
    const denied = pusat.executeReadOnly("SINAN_VOICE_GENERATE", { text: "hi" }, { actorId: "stranger" });
    expect(denied.data.code).toBe("UNAUTHORIZED_ACTOR");
    const gen = pusat.executeReadOnly("SINAN_VOICE_GENERATE", { text: "hi", lang: "en" }, { actorId: "sinan_bey" });
    expect(gen.data.officialVoiceUsed).toBe(false);
    const q = pusat.executeReadOnly("SINAN_VOICE_QUALITY", {}, { actorId: "sinan_bey" });
    expect(q.data.officialVoice).toBe(false);
    const think = createThinkingEngine();
    think.initialize();
    const pipe = thinkSpeak({ thinking: think, text: "report then wait" });
    expect(pipe.officialVoice).toBe(false);
    expect(pipe.audit.egressDenied).toBe(true);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });
});
