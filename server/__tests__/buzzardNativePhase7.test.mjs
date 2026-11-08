import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { nativeAiStatus } = require("../lib/buzzardNative/platform/nativeStatus.js");
const { runAll } = require("../lib/buzzardNative/platform/scenarios.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");
const { identities } = require("../lib/buzzardNative/platform/identity.js");
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Phase 7 integrated native platform", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("keeps honest engine statuses and avatar integrity", () => {
    const m = matrix();
    expect(m.thinking.productionTransformer).toBe("NOT_IMPLEMENTED");
    expect(m.speech.officialVoice).toBe("BLOCKED");
    expect(m.hearing.stt).toBe("NOT_IMPLEMENTED");
    expect(m.realtime.liveMedia).toBe("NOT_IMPLEMENTED");
    expect(m.platform.alwaysOnHost).toBe("NOT_IMPLEMENTED");
    const id = identities().sinan_bey;
    expect(id.digitalBody.exists).toBe(true);
    expect(id.digitalBody.is3d).toBe(false);
    expect(id.cannotSelfElevate).toBe(true);
    const st = nativeAiStatus();
    expect(st.singlePercentComplete).toBe(null);
    expect(st.productionReady).toBe(false);
    expect(st.voice.code).toBe("MISSING_REFERENCE_AUDIO");
  });

  it("runs integration scenarios without claiming live STT/TTS/media", () => {
    const s = runAll();
    expect(s.A.stt).toBe("NOT_IMPLEMENTED");
    expect(s.A.officialTts).toBe(false);
    expect(s.B.understand).toBe("NOT_IMPLEMENTED");
    expect(s.C.memoryOk).toBe(true);
    expect(s.C.thinkOk).toBe(true);
    expect(s.D.liveVoice).toBe(false);
    expect(s.E.thinkingCrashed).toBe(true);
    expect(s.E.hearingOk).toBe(true);
    expect(s.F.pass).toBe(true);
    const rt = createNativeRuntime();
    rt.initializeAll();
    const pub = rt.publish({
      fromId: "thinking",
      toId: "speech",
      topic: "reply",
      body: "x",
      classification: "shared",
    });
    expect(pub.message.fromEngine).toBe("thinking");
    expect(pub.message.classification).toBe("shared");
  });

  it("exposes Pusat native commands and keeps egress deny", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    expect(pusat.executeReadOnly("NATIVE_AI_ENGINE_STATUS", {}, { actorId: "pusat" }).data.speech.realTts).toBe(
      "NOT_IMPLEMENTED",
    );
    const test = pusat.executeReadOnly("NATIVE_AI_ENGINE_TEST", {}, { actorId: "sinan_bey" });
    expect(test.data.F.pass).toBe(true);
    expect(pusat.executeReadOnly("SINAN_PHASE7_REPORT", {}, { actorId: "sinan_bey" }).data.path).toMatch(/PHASE7/);
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });
});
