/**
 * Tiny from-scratch next-token linear model. Not a transformer. Not a general LLM.
 */
function zeros(n) {
  return new Float64Array(n);
}

function softmax(logits) {
  let m = -Infinity;
  for (const x of logits) if (x > m) m = x;
  const ex = logits.map((x) => Math.exp(x - m));
  const s = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((x) => x / s);
}

function createTinyModel({ vocabSize, dim = 8 } = {}) {
  const V = vocabSize;
  const D = dim;
  const E = zeros(V * D);
  const U = zeros(V * D);
  for (let i = 0; i < E.length; i += 1) E[i] = (Math.random() - 0.5) * 0.05;
  for (let i = 0; i < U.length; i += 1) U[i] = (Math.random() - 0.5) * 0.05;
  return { vocabSize: V, dim: D, E, U, architecture: "linear_next_token", transformer: false };
}

function embed(model, id) {
  const out = zeros(model.dim);
  const base = id * model.dim;
  for (let d = 0; d < model.dim; d += 1) out[d] = model.E[base + d];
  return out;
}

function logitsFrom(model, vec) {
  const logits = new Array(model.vocabSize);
  for (let v = 0; v < model.vocabSize; v += 1) {
    let s = 0;
    const base = v * model.dim;
    for (let d = 0; d < model.dim; d += 1) s += vec[d] * model.U[base + d];
    logits[v] = s;
  }
  return logits;
}

function trainEpoch(model, sequences, lr = 0.05) {
  let loss = 0;
  let n = 0;
  for (const seq of sequences) {
    for (let t = 0; t < seq.length - 1; t += 1) {
      const x = seq[t];
      const y = seq[t + 1];
      if (x >= model.vocabSize || y >= model.vocabSize) continue;
      const h = embed(model, x);
      const logits = logitsFrom(model, h);
      const p = softmax(logits);
      loss += -Math.log(Math.max(p[y], 1e-12));
      n += 1;
      for (let v = 0; v < model.vocabSize; v += 1) {
        const g = p[v] - (v === y ? 1 : 0);
        const ub = v * model.dim;
        const eb = x * model.dim;
        for (let d = 0; d < model.dim; d += 1) {
          model.U[ub + d] -= lr * g * h[d];
          model.E[eb + d] -= lr * g * model.U[ub + d];
        }
      }
    }
  }
  return { loss: n ? loss / n : 0, steps: n };
}

function checkpoint(model) {
  return {
    vocabSize: model.vocabSize,
    dim: model.dim,
    architecture: model.architecture,
    transformer: false,
    E: Array.from(model.E),
    U: Array.from(model.U),
  };
}

function loadCheckpoint(data) {
  const model = createTinyModel({ vocabSize: data.vocabSize, dim: data.dim });
  model.E.set(data.E);
  model.U.set(data.U);
  return model;
}

function infer(model, id) {
  const p = softmax(logitsFrom(model, embed(model, id)));
  let best = 0;
  for (let i = 1; i < p.length; i += 1) if (p[i] > p[best]) best = i;
  return { nextId: best, p: p[best], transformer: false, generalPurpose: false };
}

module.exports = { createTinyModel, trainEpoch, checkpoint, loadCheckpoint, infer };
