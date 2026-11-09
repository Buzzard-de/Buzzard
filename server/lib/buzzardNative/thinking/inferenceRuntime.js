/**
 * Isolated inference vs training. In-process only. Not LIVE_VERIFIED production.
 */
const { loadCheckpoint, verifyCheckpoint, greedyNext, forward, meanLoss } = require("./transformer");
const { encode, decode } = require("./tokenizer");

function createInferenceRuntime() {
  let loaded = null;

  function load({ checkpoint, tokenizer, actorId = "sinan_bey" } = {}) {
    if (!["sinan_bey", "pusat"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    if (!checkpoint) return { ok: false, code: "NO_CHECKPOINT" };
    const integrity = verifyCheckpoint(checkpoint);
    if (!integrity.ok) return { ok: false, code: "CHECKPOINT_CORRUPT", integrity };
    const model = loadCheckpoint(checkpoint);
    loaded = { model, tokenizer, checkpoint };
    return {
      ok: true,
      status: "TESTED",
      liveVerified: false,
      productionReady: false,
      paramsHint: checkpoint.vocabSize,
      integrity,
    };
  }

  function generate({ text, steps = 8 } = {}) {
    if (!loaded) return { ok: false, code: "NOT_LOADED", status: "PARTIAL" };
    if (!loaded.tokenizer) return { ok: false, code: "NO_TOKENIZER" };
    const t0 = Date.now();
    const rss0 = process.memoryUsage().rss;
    const cpu0 = process.cpuUsage();
    let ids = encode(String(text || " "), loaded.tokenizer).slice(0, loaded.model.nPos - steps);
    if (!ids.length) ids = [32];
    const start = Date.now();
    for (let i = 0; i < steps; i += 1) {
      const g = greedyNext(loaded.model, ids);
      ids.push(g.nextId);
      if (ids.length >= loaded.model.nPos) break;
    }
    const ms = Date.now() - start;
    return {
      ok: true,
      text: decode(ids, loaded.tokenizer),
      tokens: ids.length,
      ms: Date.now() - t0,
      inferMs: ms,
      tokensPerSec: ids.length / Math.max(ms, 1) * 1000,
      rssDelta: process.memoryUsage().rss - rss0,
      cpuUserUs: process.cpuUsage(cpu0).user,
      generalPurpose: false,
      status: "TESTED",
      liveVerified: false,
    };
  }

  function evaluate(sequences) {
    if (!loaded) return { ok: false, code: "NOT_LOADED" };
    return { ok: true, ...meanLoss(loaded.model, sequences), liveVerified: false };
  }

  function failClosed(input) {
    if (input && input.destinationUrl) return { ok: false, code: "EGRESS_FORBIDDEN_ON_INFER" };
    if (!loaded) return { ok: false, code: "NOT_LOADED" };
    try {
      forward(loaded.model, []);
      return { ok: false, code: "EMPTY_SEQUENCE" };
    } catch (err) {
      return { ok: false, code: "INFER_FAULT", error: String(err.message || err) };
    }
  }

  return { load, generate, evaluate, failClosed, get loaded() { return Boolean(loaded); } };
}

module.exports = { createInferenceRuntime };
