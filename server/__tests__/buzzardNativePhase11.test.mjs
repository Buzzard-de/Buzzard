import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { runPhase11 } = require("../lib/buzzardNative/thinking/phase11Run.js");
const { cloneAttempt, verifyOfficialFile } = require("../lib/buzzardNative/speech/officialVoiceGuard.js");
const { inspectFile } = require("../lib/buzzardNative/hearing/humanStt.js");
const { wavTone } = require("../lib/buzzardNative/speech/wavTone.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");

describe("Phase 11 voice architecture", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("keeps official hash and denies clone", () => {
    const buf = readFileSync("public/council/sinan-bey-official-voice-v1.m4a");
    expect(createHash("sha256").update(buf).digest("hex")).toBe(
      "16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d",
    );
    expect(verifyOfficialFile().unchanged).toBe(true);
    expect(cloneAttempt({ requested: true }).code).toBe("CLONE_DENIED");
  });

  it("inspects real audio without claiming human STT", () => {
    const m4a = inspectFile("public/council/sinan-bey-official-voice-v1.m4a");
    expect(m4a.format).toBe("m4a");
    expect(m4a.transcribe).toBe("NOT_IMPLEMENTED");
    expect(m4a.humanStt).toBe(false);
    const wav = inspectFile(wavTone({ hz: 170.8, ms: 100 }));
    expect(wav.format).toBe("wav");
    expect(wav.durationSec).toBeGreaterThan(0.05);
    expect(inspectFile(Buffer.from("xxxx")).ok).toBe(false);
    const rt = createNativeRuntime();
    rt.initializeAll();
    expect(rt.engines.get("hearing").execute({ op: "transcribe" }).code).toBe("NOT_IMPLEMENTED");
  });

  it("measures proto TTS latency and keeps official voice unused", () => {
    const p = runPhase11();
    expect(p.tts.officialVoiceUsed).toBe(false);
    expect(p.tts.meanLatencyMs).toBeGreaterThan(0);
    expect(p.tts.rows).toHaveLength(3);
    expect(p.clone.code).toBe("CLONE_DENIED");
    expect(p.stt.humanStt).toBe("NOT_IMPLEMENTED");
    expect(p.budgetEur).toBe(0);
    expect(p.egress).toBe(false);
    expect(matrix().hearing.stt).toBe("NOT_IMPLEMENTED");
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
  });

  it("Pusat phase 11 report", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const r = pusat.executeReadOnly("SINAN_PHASE11_REPORT", {}, { actorId: "sinan_bey" });
    expect(r.data.path).toMatch(/PHASE11/);
    expect(r.data.data.clone.code).toBe("CLONE_DENIED");
    expect(pusat.executeReadOnly("SINAN_PHASE11_REPORT", {}, { actorId: "stranger" }).data.data.code).toBe(
      "UNAUTHORIZED_ACTOR",
    );
  });
});
