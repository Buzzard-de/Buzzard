/**
 * Isolated training lab. Production promote stays WAITING_APPROVAL.
 */
const { CORPUS } = require("./corpus");
const { trainByteBpe, encode, roundtrip } = require("./tokenizer");
const { createTinyModel, trainEpoch, checkpoint, loadCheckpoint, infer } = require("./tinyModel");
const { validateDataset } = require("../trainingPipeline");

function createLab() {
  const datasets = [];
  const models = [];
  const jobs = [];
  let productionId = null;

  function registerDataset(records = CORPUS) {
    const check = validateDataset(records);
    const licenses = [...new Set(records.map((r) => r.license || "UNKNOWN"))];
    const unlicensed = licenses.filter((l) => l === "UNKNOWN");
    const ds = {
      id: `ds_${datasets.length + 1}`,
      version: 1,
      provenance: "buzzard_synthetic_public",
      licenses,
      licenseOk: unlicensed.length === 0 && check.ok,
      quality: check.ok ? 1 : 0,
      check,
      records: check.ok ? records : [],
    };
    datasets.push(ds);
    return ds;
  }

  function trainToy({ epochs = 4, dim = 8, merges = 24, requestedBy = "sinan_bey" } = {}) {
    const ds = datasets[datasets.length - 1] || registerDataset(CORPUS);
    if (!ds.licenseOk) return { ok: false, code: "DATASET_BLOCKED", production: false };
    const tok = trainByteBpe(ds.records.map((r) => r.text), merges);
    const seqs = ds.records.map((r) => encode(r.text, tok));
    const model = createTinyModel({ vocabSize: tok.vocabSize, dim });
    const losses = [];
    const t0 = Date.now();
    const mem0 = process.memoryUsage().rss;
    for (let i = 0; i < epochs; i += 1) losses.push(trainEpoch(model, seqs).loss);
    const ckpt = checkpoint(model);
    const rec = {
      id: `toy_${models.length + 1}`,
      version: models.length + 1,
      tokenizer: tok,
      checkpoint: ckpt,
      losses,
      ms: Date.now() - t0,
      rssDelta: process.memoryUsage().rss - mem0,
      transformer: false,
      generalPurpose: false,
      production: false,
      requestedBy,
    };
    models.push(rec);
    jobs.push({ id: rec.id, status: "TOY_TRAINED_ISOLATED", gpu: false, downloadedWeights: false });
    return { ok: true, ...rec, liveVerified: false };
  }

  function evaluateToy(id) {
    const rec = models.find((m) => m.id === id) || models[models.length - 1];
    if (!rec) return { ok: false, code: "NO_MODEL" };
    const model = loadCheckpoint(rec.checkpoint);
    const sample = CORPUS[0].text;
    const rt = roundtrip(sample, rec.tokenizer);
    const first = rec.tokenizer ? require("./tokenizer").encode(sample, rec.tokenizer)[0] : 0;
    const inf = infer(model, first);
    return {
      ok: rt.ok,
      roundtrip: rt,
      infer: inf,
      architecture: rec.checkpoint.architecture,
      transformerImplemented: false,
      generalPurpose: false,
      production: productionId === rec.id,
    };
  }

  function rollback(version) {
    const rec = models.find((m) => m.version === version);
    if (!rec) return { ok: false, code: "UNKNOWN_VERSION" };
    productionId = null;
    return { ok: true, active: rec.id, production: false, note: "isolated_rollback_only" };
  }

  function promote({ humanApproved = false } = {}) {
    if (!humanApproved) return { ok: false, code: "WAITING_APPROVAL", production: false };
    return { ok: false, code: "WAITING_APPROVAL", note: "suleyman_bey_required", production: false };
  }

  return { registerDataset, trainToy, evaluateToy, rollback, promote, datasets, models, jobs };
}

const ARCHITECTURE_SPEC = Object.freeze({
  ruleEngine: "separate_module",
  learnedEngine: "tiny_linear_next_token",
  transformer: { status: "CODE_READY", kind: "tiny_causal_1block", layers: 1, heads: 2, generalPurpose: false },
  embeddings: { dim: 8, trainedFromScratch: true },
  attention: { status: "CODE_READY", causal: true },
});

module.exports = { createLab, ARCHITECTURE_SPEC };
