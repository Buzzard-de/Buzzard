import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTransformerLab } = require("../lib/buzzardNative/thinking/transformerLab.js");
const { runReasoning } = require("../lib/buzzardNative/thinking/reasoningEval.js");
const { createThinkingEngine } = require("../lib/buzzardNative/engines/thinking.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");
const { probeHardware } = require("../lib/buzzardNative/thinking/hardwareProbe.js");

describe("Phase 5 tiny causal transformer", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("trains from scratch, checkpoints, and does not claim general intelligence", () => {
    const lab = createTransformerLab();
    const trained = lab.trainRun({ epochs: 1, actorId: "sinan_bey" });
    expect(trained.ok).toBe(true);
    expect(trained.downloadedWeights).toBe(false);
    expect(trained.transformer).toBe(true);
    expect(trained.generalPurpose).toBe(false);
    expect(trained.production).toBe(false);
    expect(trained.params).toBeGreaterThan(1000);
    expect(Number.isFinite(trained.trainLoss)).toBe(true);
    expect(trained.integrity.ok).toBe(true);
    const ev = lab.evaluate();
    expect(ev.ok).toBe(true);
    expect(ev.loadMatch).toBe(true);
    const tok = lab.tokenizerTest();
    expect(tok.utf8Roundtrip).toBe(true);
    expect(tok.tr.ok).toBe(true);
    expect(tok.de.ok).toBe(true);
    expect(tok.long.ok).toBe(true);
    expect(tok.unknownToken).toMatch(/byte_level/);
    const cmp = lab.compareLinear({ epochs: 1 });
    expect(cmp.transformer.valLoss).toEqual(expect.any(Number));
    expect(cmp.linear.valLoss).toEqual(expect.any(Number));
    expect(cmp.note).toMatch(/not a win/i);
    const reason = runReasoning(lab);
    expect(reason.reasoningClaim).toBe(false);
    expect(reason.total).toBe(11);
    const hw = lab.hardwareReport();
    expect(hw.purchased).toBe(false);
    expect(hw.probe.cpuCores === "UNKNOWN" || hw.probe.cpuCores >= 1).toBe(true);
  });

  it("keeps full transformer op unimplemented and blocks unsafe train", () => {
    const think = createThinkingEngine();
    think.initialize();
    expect(think.execute({ op: "transformer" }).code).toBe("NOT_IMPLEMENTED");
    const lab = createTransformerLab();
    expect(lab.trainRun({ epochs: 9, actorId: "sinan_bey" }).code).toBe("RESOURCE_LIMIT");
    expect(lab.trainRun({ epochs: 1, actorId: "stranger" }).code).toBe("UNAUTHORIZED_ACTOR");
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } }).allowed).toBe(
      false,
    );
    expect(isSalesEnabled()).toBe(false);
  });

  it("exposes Pusat transformer commands without production promote", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const denied = pusat.executeReadOnly("SINAN_TRAIN_RUN", { epochs: 1 }, { actorId: "stranger" });
    expect(denied.data.code).toBe("UNAUTHORIZED_ACTOR");
    const run = pusat.executeReadOnly("SINAN_TRAIN_RUN", { epochs: 1 }, { actorId: "sinan_bey" });
    expect(run.data.ok).toBe(true);
    expect(run.data.production).toBe(false);
    const st = pusat.executeReadOnly("SINAN_TRANSFORMER_STATUS", {}, { actorId: "pusat" });
    expect(st.data.stt).toBe(false);
    expect(st.data.tts).toBe(false);
    const tok = pusat.executeReadOnly("SINAN_TOKENIZER_TEST", {}, { actorId: "sinan_bey" });
    expect(tok.data.utf8Roundtrip).toBe(true);
    const ev = pusat.executeReadOnly("SINAN_MODEL_EVALUATE", {}, { actorId: "sinan_bey" });
    expect(ev.data.ok).toBe(true);
    const cmp = pusat.executeReadOnly("SINAN_MODEL_COMPARE", { epochs: 1 }, { actorId: "sinan_bey" });
    expect(cmp.data.ok).toBe(true);
    const hw = pusat.executeReadOnly("SINAN_HARDWARE_REPORT", {}, { actorId: "sinan_bey" });
    expect(hw.data.quoted).toBe(false);
    const rep = pusat.executeReadOnly("SINAN_PHASE5_REPORT", {}, { actorId: "sinan_bey" });
    expect(rep.data.path).toMatch(/PHASE5_REPORT/);
    expect(probeHardware().cuda).toBe(false);
  });
});
