import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { trainByteBpe, roundtrip } = require("../lib/buzzardNative/thinking/tokenizer.js");
const { CORPUS } = require("../lib/buzzardNative/thinking/corpus.js");
const { createLab } = require("../lib/buzzardNative/thinking/lab.js");
const { validateDataset } = require("../lib/buzzardNative/trainingPipeline.js");
const { probeHardware } = require("../lib/buzzardNative/thinking/hardwareProbe.js");
const { costHorizon } = require("../lib/buzzardNative/thinking/costHorizon.js");
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");
const { createThinkingEngine } = require("../lib/buzzardNative/engines/thinking.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");
const { db } = require("../lib/db.js");
const { createSinanBeyAgent } = require("../lib/pusat/sinanBeyAgent.js");

describe("Phase 4 thinking lab", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("roundtrips Turkish and German with a from-scratch byte BPE", () => {
    const model = trainByteBpe(
      CORPUS.map((r) => r.text),
      24,
    );
    expect(model.downloaded).toBe(false);
    const tr = roundtrip("Türkçe karakterler: ğüşöçıĞÜŞÖÇ.", model);
    const de = roundtrip("Deutsche Zeichen: äöüßÄÖÜ.", model);
    expect(tr.ok).toBe(true);
    expect(de.ok).toBe(true);
    expect(tr.tokens).toBeGreaterThan(0);
    expect(de.compression).toBeGreaterThan(0);
  });

  it("trains a tiny isolated model, checkpoints, infers, and refuses production promote", () => {
    const lab = createLab();
    const ds = lab.registerDataset();
    expect(ds.licenseOk).toBe(true);
    const trained = lab.trainToy({ epochs: 2, dim: 4, merges: 12 });
    expect(trained.ok).toBe(true);
    expect(trained.transformer).toBe(false);
    expect(trained.generalPurpose).toBe(false);
    expect(trained.production).toBe(false);
    const ev = lab.evaluateToy(trained.id);
    expect(ev.roundtrip.ok).toBe(true);
    expect(ev.infer.generalPurpose).toBe(false);
    const loaded = lab.evaluateToy(trained.id);
    expect(loaded.ok).toBe(true);
    expect(lab.rollback(trained.version).production).toBe(false);
    expect(lab.promote().code).toBe("WAITING_APPROVAL");
    expect(trained.rssDelta).toEqual(expect.any(Number));
  });

  it("blocks classified and unlicensed data and keeps STT/TTS unimplemented", () => {
    expect(validateDataset([{ classification: "customer", text: "x", license: "BUZZARD_ORIGINAL" }]).ok).toBe(false);
    expect(validateDataset([{ classification: "public", text: "x" }]).rejected.some((r) => r.reason === "LICENSE_UNKNOWN")).toBe(
      true,
    );
    const rt = createNativeRuntime();
    rt.initializeAll();
    rt.enqueue({ engineId: "hearing", actorId: "sinan_bey", payload: { op: "transcribe" } });
    expect(rt.runNext().result.code).toBe("NOT_IMPLEMENTED");
    rt.enqueue({ engineId: "speech", actorId: "sinan_bey", payload: { op: "synthesize" } });
    expect(rt.runNext().result.code).toBe("NOT_IMPLEMENTED");
    const think = createThinkingEngine();
    think.initialize();
    const rules = think.execute({ op: "tokenize", text: "analyze then report" });
    expect(rules.learned).toBe(false);
    const toy = think.execute({ op: "toy_train", epochs: 1, dim: 4, merges: 8 });
    expect(toy.learned).toBe(true);
    expect(toy.ruleBased).toBe(false);
    expect(think.execute({ op: "transformer" }).code).toBe("NOT_IMPLEMENTED");
  });

  it("connects Pusat, memory isolation, hardware probe, and egress DENY", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const plan = pusat.executeReadOnly("SINAN_TRAIN_PLAN", {}, { actorId: "pusat" });
    expect(plan.data.gpu).toBe(false);
    expect(plan.data.reply).toBe("NEEDS_APPROVAL");
    const toy = pusat.executeReadOnly("SINAN_TOY_TRAIN", { epochs: 1, dim: 4, merges: 8 }, { actorId: "sinan_bey" });
    expect(toy.data.production).toBe(false);
    const st = pusat.executeReadOnly("SINAN_MODEL_STATUS", {}, { actorId: "sinan_bey" });
    expect(st.data.promote.code).toBe("WAITING_APPROVAL");
    const agent = createSinanBeyAgent({ db });
    const mem = agent.remember({ section: "C", key: "phase4", value: "toy-only", source: "test" });
    expect(mem.ok).toBe(true);
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } }).allowed).toBe(false);
    expect(isSalesEnabled()).toBe(false);
    const hw = probeHardware();
    expect(hw.os).toBeTruthy();
    expect(hw.cpuCores === "UNKNOWN" || hw.cpuCores >= 1).toBe(true);
    expect(costHorizon().quoted).toBe(false);
  });
});
