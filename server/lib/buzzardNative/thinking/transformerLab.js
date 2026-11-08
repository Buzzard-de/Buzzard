const { TRAIN, VAL, HELDOUT, META } = require("./phase5Corpus");
const { trainByteBpe, encode, decode } = require("./tokenizer");
const { validateDataset } = require("../trainingPipeline");
const {
  createTransformer,
  paramCount,
  trainTransformer,
  meanLoss,
  checkpoint,
  loadCheckpoint,
  verifyCheckpoint,
  greedyNext,
} = require("./transformer");
const { createTinyModel, trainEpoch, checkpoint: ckLinear, loadCheckpoint: loadLinear, sequenceLoss } = require("./tinyModel");
const { measureTokenizer } = require("./tokenizerMetrics");
const { probeHardware } = require("./hardwareProbe");
const { costHorizon } = require("./costHorizon");

function createTransformerLab() {
  let last = null;

  function trainRun({ epochs = 2, actorId = "sinan_bey", lr = 0.08 } = {}) {
    if (!["sinan_bey", "pusat"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    if (epochs > 3) return { ok: false, code: "RESOURCE_LIMIT", maxEpochs: 3 };
    const check = validateDataset([...TRAIN, ...VAL, ...HELDOUT]);
    if (!check.ok) return { ok: false, code: "DATASET_BLOCKED", check };
    const tok = trainByteBpe(TRAIN.map((r) => r.text), 24);
    const trSeq = TRAIN.map((r) => encode(r.text, tok));
    const vaSeq = VAL.map((r) => encode(r.text, tok));
    const model = createTransformer({ vocabSize: tok.vocabSize, dModel: 8, nHeads: 2, nPos: 24, dff: 16, seed: 11 });
    const before = meanLoss(model, vaSeq);
    const fit = trainTransformer(model, trSeq, { epochs, lr });
    const afterTr = meanLoss(model, trSeq);
    const afterVa = meanLoss(model, vaSeq);
    const held = meanLoss(model, HELDOUT.map((r) => encode(r.text, tok)));
    const ckpt = checkpoint(model);
    const integrity = verifyCheckpoint(ckpt);
    last = {
      tokenizer: tok,
      model,
      ckpt,
      integrity,
      fit,
      train: afterTr,
      val: afterVa,
      heldout: held,
      valBefore: before,
      params: paramCount(model),
      production: false,
      downloadedWeights: false,
      dataset: {
        train: TRAIN.length,
        val: VAL.length,
        heldout: HELDOUT.length,
        license: META.license,
        source: META.source,
        classification: META.classification,
        usedInTraining: TRAIN.map((r) => ({ lang: r.lang, bytes: Buffer.byteLength(r.text), license: r.license })),
      },
    };
    return { ok: true, ...summarize(last), liveVerified: false, generalPurpose: false };
  }

  function summarize(rec) {
    if (!rec) return { ok: false, code: "NO_MODEL" };
    return {
      ok: true,
      architecture: rec.model.architecture,
      params: rec.params,
      checkpointBytes: rec.ckpt.bytes,
      integrity: rec.integrity,
      trainLoss: rec.train.loss,
      valLoss: rec.val.loss,
      heldoutLoss: rec.heldout.loss,
      trainPpl: rec.train.perplexity,
      valPpl: rec.val.perplexity,
      valPplBefore: rec.valBefore.perplexity,
      tokensPerSec: rec.train.tokensPerSec,
      fitMs: rec.fit.ms,
      rssDelta: rec.fit.rssDelta,
      cpuUserUs: rec.fit.cpuUserUs,
      aborted: rec.fit.aborted,
      production: false,
      transformer: true,
      generalPurpose: false,
      downloadedWeights: false,
    };
  }

  function evaluate() {
    if (!last) return { ok: false, code: "NO_MODEL" };
    const loaded = loadCheckpoint(last.ckpt);
    const ids = encode(TRAIN[0].text, last.tokenizer);
    const a = greedyNext(last.model, ids.slice(0, 8));
    const b = greedyNext(loaded, ids.slice(0, 8));
    return { ok: a.nextId === b.nextId, loadMatch: a.nextId === b.nextId, a, b, ...summarize(last) };
  }

  function compareLinear({ epochs = 2 } = {}) {
    if (!last) trainRun({ epochs, actorId: "sinan_bey" });
    const tok = last.tokenizer;
    const trSeq = TRAIN.map((r) => encode(r.text, tok));
    const vaSeq = VAL.map((r) => encode(r.text, tok));
    const linear = createTinyModel({ vocabSize: tok.vocabSize, dim: 8 });
    const t0 = Date.now();
    const rss0 = process.memoryUsage().rss;
    for (let i = 0; i < epochs; i += 1) trainEpoch(linear, trSeq);
    const linVal = sequenceLoss(linear, vaSeq);
    const linCk = ckLinear(linear);
    loadLinear(linCk);
    const xf = summarize(last);
    const xfBetter = xf.valLoss < linVal.loss;
    return {
      ok: true,
      transformer: {
        params: xf.params,
        valLoss: xf.valLoss,
        valPpl: xf.valPpl,
        ms: xf.fitMs,
        rssDelta: xf.rssDelta,
        tokensPerSec: xf.tokensPerSec,
      },
      linear: {
        params: linear.E.length + linear.U.length,
        valLoss: linVal.loss,
        valPpl: linVal.perplexity,
        ms: Date.now() - t0,
        rssDelta: process.memoryUsage().rss - rss0,
        transformer: false,
      },
      transformerLowerValLoss: xfBetter,
      winner: xfBetter ? "transformer" : "linear_or_tie",
      note: "Lower val loss wins. Architecture novelty is not a win.",
    };
  }

  function generate(text, steps = 8) {
    if (!last) return { ok: false, code: "NO_MODEL" };
    let ids = encode(text, last.tokenizer).slice(0, last.model.nPos - steps);
    if (!ids.length) ids = [32];
    for (let i = 0; i < steps; i += 1) {
      const g = greedyNext(last.model, ids);
      ids.push(g.nextId);
      if (ids.length >= last.model.nPos) break;
    }
    return { ok: true, text: decode(ids, last.tokenizer), generalPurpose: false, thinkingClaim: false };
  }

  function tokenizerTest() {
    return measureTokenizer(TRAIN.map((r) => r.text));
  }

  function hardwareReport() {
    return { probe: probeHardware(), costs: costHorizon(), quoted: false, purchased: false };
  }

  function status() {
    return {
      prototype: last ? summarize(last) : { ok: false, code: "NOT_TRAINED" },
      production: false,
      stt: false,
      tts: false,
      engines: {
        thinking: "tiny_causal_transformer_optional",
        hearing: "NOT_IMPLEMENTED_stt",
        speech: "NOT_IMPLEMENTED_tts",
        vision: "sniff_only",
        memory: "isolated",
        digital_body: "pose_only",
        motion: "timeline_only",
        realtime: "signaling_only",
      },
    };
  }

  return {
    trainRun,
    evaluate,
    compareLinear,
    generate,
    tokenizerTest,
    hardwareReport,
    status,
    get last() {
      return last;
    },
  };
}

module.exports = { createTransformerLab };
