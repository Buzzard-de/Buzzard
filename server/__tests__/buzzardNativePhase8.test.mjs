import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { runPhase8Thinking } = require("../lib/buzzardNative/thinking/phase8Thinking.js");
const { registry } = require("../lib/buzzardNative/thinking/datasetRegistry.js");
const { createHearingEngine } = require("../lib/buzzardNative/engines/hearing.js");
const { createVisionEngine } = require("../lib/buzzardNative/engines/vision.js");
const { createMemoryEngine } = require("../lib/buzzardNative/engines/memory.js");
const { wavTone } = require("../lib/buzzardNative/speech/wavTone.js");
const { analyzeOfficialVoice } = require("../lib/buzzardNative/speech/voiceIdentity.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Phase 8 thinking inference and gates", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("separates train from inference and rejects corrupt or unauthorized loads", () => {
    const r = runPhase8Thinking({ actorId: "sinan_bey" });
    expect(r.productionTransformer.code).toBe("NOT_IMPLEMENTED");
    expect(r.train.ok).toBe(true);
    expect(r.inference.gen.ok).toBe(true);
    expect(r.inference.liveVerified).toBe(false);
    expect(r.inference.gen.generalPurpose).toBe(false);
    expect(r.corruptLoad.code).toBe("CHECKPOINT_CORRUPT");
    expect(r.unauthorizedLoad.code).toBe("UNAUTHORIZED_ACTOR");
    expect(registry().leak.leaked).toBe(false);
    expect(registry().synthetic).toBe(true);
  });

  it("rejects bad audio and images without claiming STT or understanding", () => {
    const h = createHearingEngine();
    h.initialize();
    expect(h.execute({ op: "validate", bytes: Buffer.from("nope") }).code).toBe("UNSUPPORTED_OR_CORRUPT_AUDIO");
    expect(h.execute({ op: "validate", bytes: wavTone({ ms: 40 }) }).ok).toBe(true);
    expect(h.execute({ op: "validate", bytes: wavTone({ ms: 40 }) }).stt).toBe(false);
    expect(h.execute({ op: "transcribe" }).code).toBe("NOT_IMPLEMENTED");
    expect(h.execute({ op: "transcribe" }).vadIsNotStt).toBe(true);
    const v = createVisionEngine();
    v.initialize();
    expect(v.execute({ op: "validate", bytes: Buffer.from("xx") }).code).toBe("UNSUPPORTED_OR_CORRUPT_IMAGE");
    expect(v.execute({ op: "validate", bytes: readFileSync("public/council/sinan-bey.png") }).understanding).toBe(false);
    expect(v.execute({ op: "understand" }).code).toBe("NOT_IMPLEMENTED");
    expect(analyzeOfficialVoice({ actorId: "sinan_bey" }).ttsReady).toBe(false);
  });

  it("keeps memory integrity, Pusat phase8, and egress deny", () => {
    const mem = createMemoryEngine();
    mem.initialize();
    const put = mem.execute({ op: "put", ownerId: "sinan_bey", actorId: "sinan_bey", key: "p8", value: 1 });
    expect(put.integrity).toMatch(/^[a-f0-9]{64}$/);
    expect(mem.execute({ op: "get", ownerId: "sinan_bey", actorId: "pusat", key: "p8" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.execute({ op: "integrity", ownerId: "sinan_bey", actorId: "sinan_bey", key: "p8" }).intact).toBe(true);
    expect(mem.execute({ op: "backup", ownerId: "sinan_bey", actorId: "sinan_bey" }).offsite).toBe(false);
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const denied = pusat.executeReadOnly("SINAN_PHASE8_THINKING", {}, { actorId: "stranger" });
    expect(denied.data.code).toBe("UNAUTHORIZED_ACTOR");
    expect(pusat.executeReadOnly("SINAN_PHASE8_REPORT", {}, { actorId: "sinan_bey" }).data.path).toMatch(/PHASE8/);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } }).allowed).toBe(
      false,
    );
    expect(isSalesEnabled()).toBe(false);
  });
});
