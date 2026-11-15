import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { runE2E, resilience } = require("../lib/buzzardNative/platform/phase18E2E.js");
const { runPhase18 } = require("../lib/buzzardNative/thinking/phase18Run.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");

describe("Phase 18 acceptance", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("proves each E2E step without substituting simulation for human STT or live media", () => {
    const e = runE2E();
    const stt = e.steps.find((s) => s.id === "3_human_stt");
    expect(stt.real).toBe(false);
    expect(stt.generalStt).toBe(false);
    expect(e.steps.find((s) => s.id === "4_thinking").real).toBe(true);
    expect(e.steps.find((s) => s.id === "7_speech").officialVoiceUsed).toBe(false);
    expect(e.steps.find((s) => s.id === "8_body").lipSyncPass).toBe(false);
    expect(e.steps.find((s) => s.id === "9_realtime").liveMedia).toBe(false);
    expect(e.steps.find((s) => s.id === "11_unauthorized").real).toBe(true);
    expect(e.steps.find((s) => s.id === "12_security").real).toBe(true);
    const r = resilience();
    expect(r.thinkingCrashed).toBe(true);
    expect(r.hearingAfterCrash).toBe(true);
    expect(r.egress).toBe(true);
    const p = runPhase18();
    expect(p.liveVerified).toBe(false);
    expect(p.productionReady).toBe(false);
    expect(p.singlePercentComplete).toBe(null);
    expect(p.official.unchanged).toBe(true);
    expect(matrix().hearing.stt).toBe("NOT_IMPLEMENTED");
    expect(matrix().speech.officialTts).toBe("NOT_IMPLEMENTED");
    const buf = readFileSync("public/council/sinan-bey-official-voice-v1.m4a");
    expect(createHash("sha256").update(buf).digest("hex")).toBe(
      "16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d",
    );
  });

  it("Pusat phase 18 report is dry-run", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const r = pusat.executeReadOnly("SINAN_PHASE18_REPORT", {}, { actorId: "sinan_bey" });
    expect(r.data.path).toMatch(/PHASE18/);
    expect(r.data.data.liveVerified).toBe(false);
  });
});
