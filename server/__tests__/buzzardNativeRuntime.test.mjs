import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");
const { runCouncilTurn } = require("../lib/buzzardNative/pipeline.js");
const { validateDataset, createTrainingJob } = require("../lib/buzzardNative/trainingPipeline.js");
const { hardwareScenarios } = require("../lib/buzzardNative/hardwareScenarios.js");
const { keyRecoveryProcedure } = require("../lib/buzzardNative/keyRecovery.js");
const { wavTone } = require("../lib/buzzardNative/engines/speech.js");
const { sniff } = require("../lib/buzzardNative/engines/vision.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Buzzard Native AI Runtime phase 3", () => {
  it("starts eight engines, shuts them down, and keeps a queue", () => {
    const rt = createNativeRuntime();
    const init = rt.initializeAll();
    expect(Object.keys(init.results)).toHaveLength(8);
    expect(Object.values(init.results).every((r) => r.ok)).toBe(true);
    const q = rt.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "plan", goal: "analyze then report" } });
    expect(q.ok).toBe(true);
    const run = rt.runNext();
    expect(run.ok).toBe(true);
    expect(run.result.steps).toEqual(["analyze", "report"]);
    expect(run.result.learned).toBe(false);
    expect(run.result.generalPurposeModel).toBe(false);
    expect(rt.shutdownAll().ok).toBe(true);
  });

  it("isolates a thinking crash and still serves hearing", () => {
    const rt = createNativeRuntime();
    rt.initializeAll();
    rt.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "crash" } });
    const crashed = rt.runNext();
    expect(crashed.result.ok).toBe(false);
    expect(crashed.result.crashed).toBe(true);
    rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "vad", pcm: Buffer.alloc(32) } });
    const hear = rt.runNext();
    expect(hear.ok).toBe(true);
    expect(hear.result.liveStt || false).toBe(false);
    expect(hear.result.stt).toBe(false);
    expect(rt.recover("thinking").ok).toBe(true);
  });

  it("denies unauthorized actors, isolation leaks, resource overflow, and AI egress", () => {
    const rt = createNativeRuntime({ maxJobs: 1 });
    rt.initializeAll();
    expect(rt.enqueue({ engineId: "thinking", actorId: "stranger", payload: { op: "plan" } }).code).toBe(
      "UNAUTHORIZED_ACTOR",
    );
    rt.enqueue({ engineId: "memory", actorId: "sinan_bey", payload: { op: "put", ownerId: "sinan_bey", actorId: "sinan_bey", key: "k", value: 1 } });
    expect(rt.runNext().ok).toBe(true);
    rt.enqueue({ engineId: "memory", actorId: "pusat", payload: { op: "get", ownerId: "sinan_bey", actorId: "pusat", key: "k" } });
    expect(rt.runNext().result.code).toBe("MEMORY_ISOLATION_DENIED");
    const busy = createNativeRuntime({ maxJobs: 0 });
    busy.initializeAll();
    expect(busy.enqueue({ engineId: "thinking", actorId: "sinan_bey", payload: { op: "plan" } }).code).toBe(
      "RESOURCE_LIMIT",
    );
    const eg = rt.enqueue({
      engineId: "thinking",
      actorId: "sinan_bey",
      payload: { op: "plan", destinationUrl: "https://api.openai.com/v1", egressPayload: { memory: true } },
    });
    expect(eg.code).toBe("EGRESS_DENIED");
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });

  it("does not treat unimplemented STT/TTS/vision as success", () => {
    const rt = createNativeRuntime();
    rt.initializeAll();
    for (const [engineId, payload] of [
      ["hearing", { op: "transcribe" }],
      ["speech", { op: "synthesize" }],
      ["vision", { op: "understand" }],
      ["digital_body", { op: "lip_sync" }],
      ["realtime", { op: "live_audio" }],
    ]) {
      rt.enqueue({ engineId, actorId: "sinan_bey", payload });
      const r = rt.runNext();
      expect(r.result.code).toBe("NOT_IMPLEMENTED");
      expect(r.ok).toBe(false);
    }
    expect(wavTone().slice(0, 4).toString()).toBe("RIFF");
    expect(sniff(readFileSync("public/council/sinan-bey.png")).format).toBe("png");
    expect(createTrainingJob().gpuStarted).toBe(false);
    expect(createTrainingJob().weightsDownloaded).toBe(false);
    expect(validateDataset([{ classification: "customer", text: "secret" }]).ok).toBe(false);
    expect(hardwareScenarios().quoted).toBe(false);
    expect(keyRecoveryProcedure().inGit).toBe(false);
    const pipe = runCouncilTurn(rt, { text: "listen then answer", pcm: Buffer.alloc(8) });
    expect(pipe.learnedModel).toBe(false);
    expect(pipe.liveTts).toBe(false);
  });
});
