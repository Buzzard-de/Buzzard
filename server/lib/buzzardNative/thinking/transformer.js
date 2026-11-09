/**
 * Tiny causal Transformer trained from scratch. Not a general LLM.
 * 1 block, multi-head attention, FFN, residual, LayerNorm, SGD.
 */
const crypto = require("crypto");

const RSS_LIMIT = 10 * 1024 * 1024 * 1024;
const TIME_LIMIT_MS = 45000;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function zeros(n) {
  return new Float64Array(n);
}

function fillRand(arr, rnd, scale) {
  for (let i = 0; i < arr.length; i += 1) arr[i] = (rnd() - 0.5) * scale;
}

function softmax(xs) {
  let m = -Infinity;
  for (const x of xs) if (x > m) m = x;
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0) || 1;
  return e.map((x) => x / s);
}

function createTransformer({ vocabSize, dModel = 8, nHeads = 2, nPos = 24, dff = 16, seed = 7 } = {}) {
  if (dModel % nHeads !== 0) throw new Error("dModel must divide nHeads");
  const rnd = rng(seed);
  const D = dModel;
  const H = nHeads;
  const Dh = D / H;
  const P = nPos;
  const F = dff;
  const V = vocabSize;
  const scale = 0.08;
  const m = {
    vocabSize: V,
    dModel: D,
    nHeads: H,
    dHead: Dh,
    nPos: P,
    dff: F,
    nLayers: 1,
    architecture: "tiny_causal_transformer",
    transformer: true,
    generalPurpose: false,
    tokE: zeros(V * D),
    posE: zeros(P * D),
    ln1g: zeros(D),
    ln1b: zeros(D),
    Wq: zeros(D * D),
    Wk: zeros(D * D),
    Wv: zeros(D * D),
    Wo: zeros(D * D),
    ln2g: zeros(D),
    ln2b: zeros(D),
    W1: zeros(D * F),
    b1: zeros(F),
    W2: zeros(F * D),
    b2: zeros(D),
    lng: zeros(D),
    lnb: zeros(D),
    Wout: zeros(D * V),
    bout: zeros(V),
  };
  fillRand(m.tokE, rnd, scale);
  fillRand(m.posE, rnd, scale);
  fillRand(m.Wq, rnd, scale);
  fillRand(m.Wk, rnd, scale);
  fillRand(m.Wv, rnd, scale);
  fillRand(m.Wo, rnd, scale);
  fillRand(m.W1, rnd, scale);
  fillRand(m.W2, rnd, scale);
  fillRand(m.Wout, rnd, scale);
  for (let i = 0; i < D; i += 1) {
    m.ln1g[i] = 1;
    m.ln2g[i] = 1;
    m.lng[i] = 1;
  }
  return m;
}

function paramCount(m) {
  return (
    m.tokE.length +
    m.posE.length +
    m.ln1g.length * 2 +
    m.Wq.length * 4 +
    m.ln2g.length * 2 +
    m.W1.length +
    m.b1.length +
    m.W2.length +
    m.b2.length +
    m.lng.length * 2 +
    m.Wout.length +
    m.bout.length
  );
}

function layerNorm(x, g, b, eps = 1e-5) {
  const D = x.length;
  let mean = 0;
  for (let i = 0; i < D; i += 1) mean += x[i];
  mean /= D;
  let var_ = 0;
  for (let i = 0; i < D; i += 1) var_ += (x[i] - mean) ** 2;
  var_ /= D;
  const inv = 1 / Math.sqrt(var_ + eps);
  const y = zeros(D);
  const hat = zeros(D);
  for (let i = 0; i < D; i += 1) {
    hat[i] = (x[i] - mean) * inv;
    y[i] = g[i] * hat[i] + b[i];
  }
  return { y, hat, inv, mean };
}

function dLayerNorm(dy, hat, inv, g) {
  const D = dy.length;
  const dxhat = zeros(D);
  const dg = zeros(D);
  const db = zeros(D);
  for (let i = 0; i < D; i += 1) {
    dg[i] = dy[i] * hat[i];
    db[i] = dy[i];
    dxhat[i] = dy[i] * g[i];
  }
  let sum = 0;
  let sumH = 0;
  for (let i = 0; i < D; i += 1) {
    sum += dxhat[i];
    sumH += dxhat[i] * hat[i];
  }
  const dx = zeros(D);
  for (let i = 0; i < D; i += 1) dx[i] = (inv / D) * (D * dxhat[i] - sum - hat[i] * sumH);
  return { dx, dg, db };
}

function gemv(W, rows, cols, x) {
  const y = zeros(rows);
  for (let r = 0; r < rows; r += 1) {
    let s = 0;
    const off = r * cols;
    for (let c = 0; c < cols; c += 1) s += W[off + c] * x[c];
    y[r] = s;
  }
  return y;
}

function add_(a, b) {
  for (let i = 0; i < a.length; i += 1) a[i] += b[i];
}

function relu(x) {
  const y = zeros(x.length);
  for (let i = 0; i < x.length; i += 1) y[i] = x[i] > 0 ? x[i] : 0;
  return y;
}

function row(mat, D, t) {
  return mat.subarray(t * D, t * D + D);
}

function forward(model, ids) {
  const T = Math.min(ids.length, model.nPos);
  const D = model.dModel;
  const H = model.nHeads;
  const Dh = model.dHead;
  const V = model.vocabSize;
  const X = zeros(T * D);
  for (let t = 0; t < T; t += 1) {
    const id = ids[t];
    for (let d = 0; d < D; d += 1) X[t * D + d] = model.tokE[id * D + d] + model.posE[t * D + d];
  }
  const n1 = [];
  const N1 = zeros(T * D);
  for (let t = 0; t < T; t += 1) {
    n1[t] = layerNorm(row(X, D, t), model.ln1g, model.ln1b);
    row(N1, D, t).set(n1[t].y);
  }
  const Q = zeros(T * D);
  const K = zeros(T * D);
  const Vv = zeros(T * D);
  for (let t = 0; t < T; t += 1) {
    gemv(model.Wq, D, D, row(N1, D, t)).forEach((v, i) => {
      Q[t * D + i] = v;
    });
    gemv(model.Wk, D, D, row(N1, D, t)).forEach((v, i) => {
      K[t * D + i] = v;
    });
    gemv(model.Wv, D, D, row(N1, D, t)).forEach((v, i) => {
      Vv[t * D + i] = v;
    });
  }
  const attn = [];
  const Yh = zeros(T * D);
  for (let h = 0; h < H; h += 1) {
    attn[h] = [];
    for (let t = 0; t < T; t += 1) {
      const scores = [];
      for (let s = 0; s <= t; s += 1) {
        let dot = 0;
        for (let d = 0; d < Dh; d += 1) {
          dot += Q[t * D + h * Dh + d] * K[s * D + h * Dh + d];
        }
        scores.push(dot / Math.sqrt(Dh));
      }
      const p = softmax(scores);
      attn[h][t] = p;
      for (let s = 0; s <= t; s += 1) {
        for (let d = 0; d < Dh; d += 1) Yh[t * D + h * Dh + d] += p[s] * Vv[s * D + h * Dh + d];
      }
    }
  }
  const A = zeros(T * D);
  for (let t = 0; t < T; t += 1) {
    const o = gemv(model.Wo, D, D, row(Yh, D, t));
    for (let d = 0; d < D; d += 1) A[t * D + d] = X[t * D + d] + o[d];
  }
  const n2 = [];
  const N2 = zeros(T * D);
  const H1 = zeros(T * model.dff);
  const Hrel = zeros(T * model.dff);
  const Fout = zeros(T * D);
  for (let t = 0; t < T; t += 1) {
    n2[t] = layerNorm(row(A, D, t), model.ln2g, model.ln2b);
    N2.set(n2[t].y, t * D);
    const z = gemv(model.W1, model.dff, D, n2[t].y);
    for (let i = 0; i < model.dff; i += 1) {
      z[i] += model.b1[i];
      H1[t * model.dff + i] = z[i];
      Hrel[t * model.dff + i] = z[i] > 0 ? z[i] : 0;
    }
    const f = gemv(model.W2, D, model.dff, row(Hrel, model.dff, t));
    for (let d = 0; d < D; d += 1) Fout[t * D + d] = A[t * D + d] + f[d] + model.b2[d];
  }
  const n3 = [];
  const logits = [];
  for (let t = 0; t < T; t += 1) {
    n3[t] = layerNorm(row(Fout, D, t), model.lng, model.lnb);
    const lo = Array.from(gemv(model.Wout, V, D, n3[t].y));
    for (let v = 0; v < V; v += 1) lo[v] += model.bout[v];
    logits.push(lo);
  }
  return { T, X, n1, N1, Q, K, Vv, attn, Yh, A, n2, H1, Hrel, Fout, n3, logits };
}

function lossOn(logits, ids) {
  let loss = 0;
  let n = 0;
  for (let t = 0; t < ids.length - 1 && t < logits.length - 1; t += 1) {
    const p = softmax(logits[t]);
    const y = ids[t + 1];
    loss += -Math.log(Math.max(p[y] || 1e-12, 1e-12));
    n += 1;
  }
  return { loss: n ? loss / n : 0, n };
}

function zeroLike(m) {
  const g = {};
  for (const k of Object.keys(m)) {
    if (m[k] instanceof Float64Array) g[k] = zeros(m[k].length);
  }
  return g;
}

function backward(model, ids, cache) {
  const g = zeroLike(model);
  const T = cache.T;
  const D = model.dModel;
  const H = model.nHeads;
  const Dh = model.dHead;
  const V = model.vocabSize;
  const F = model.dff;
  const dFout = zeros(T * D);
  const dA = zeros(T * D);
  const dN1 = zeros(T * D);
  const dYh = zeros(T * D);
  const dQ = zeros(T * D);
  const dK = zeros(T * D);
  const dVv = zeros(T * D);
  const dX = zeros(T * D);

  for (let t = 0; t < T - 1; t += 1) {
    const p = softmax(cache.logits[t]);
    const y = ids[t + 1];
    const dlogits = p.map((pv, i) => pv - (i === y ? 1 : 0));
    for (let v = 0; v < V; v += 1) {
      g.bout[v] += dlogits[v] / (T - 1);
      for (let d = 0; d < D; d += 1) {
        g.Wout[v * D + d] += (dlogits[v] * cache.n3[t].y[d]) / (T - 1);
      }
    }
    const dy = zeros(D);
    for (let d = 0; d < D; d += 1) {
      let s = 0;
      for (let v = 0; v < V; v += 1) s += model.Wout[v * D + d] * dlogits[v];
      dy[d] = s / (T - 1);
    }
    const dln = dLayerNorm(dy, cache.n3[t].hat, cache.n3[t].inv, model.lng);
    add_(g.lng, dln.dg);
    add_(g.lnb, dln.db);
    add_(row(dFout, D, t), dln.dx);
  }

  for (let t = 0; t < T; t += 1) {
    add_(row(dA, D, t), row(dFout, D, t));
    const df = row(dFout, D, t);
    add_(g.b2, df);
    const rel = row(cache.Hrel, F, t);
    for (let o = 0; o < D; o += 1) {
      for (let i = 0; i < F; i += 1) g.W2[o * F + i] += df[o] * rel[i];
    }
    const drel = zeros(F);
    for (let i = 0; i < F; i += 1) {
      let s = 0;
      for (let o = 0; o < D; o += 1) s += model.W2[o * F + i] * df[o];
      drel[i] = cache.H1[t * F + i] > 0 ? s : 0;
    }
    add_(g.b1, drel);
    const dn2 = zeros(D);
    for (let i = 0; i < F; i += 1) {
      for (let d = 0; d < D; d += 1) {
        g.W1[i * D + d] += drel[i] * cache.n2[t].y[d];
        dn2[d] += model.W1[i * D + d] * drel[i];
      }
    }
    const dln2 = dLayerNorm(dn2, cache.n2[t].hat, cache.n2[t].inv, model.ln2g);
    add_(g.ln2g, dln2.dg);
    add_(g.ln2b, dln2.db);
    add_(row(dA, D, t), dln2.dx);
  }

  for (let t = 0; t < T; t += 1) {
    add_(row(dX, D, t), row(dA, D, t));
    const da = row(dA, D, t);
    for (let o = 0; o < D; o += 1) {
      for (let i = 0; i < D; i += 1) g.Wo[o * D + i] += da[o] * cache.Yh[t * D + i];
    }
    const dyh = zeros(D);
    for (let i = 0; i < D; i += 1) {
      let s = 0;
      for (let o = 0; o < D; o += 1) s += model.Wo[o * D + i] * da[o];
      dyh[i] = s;
    }
    row(dYh, D, t).set(dyh);
  }

  for (let h = 0; h < H; h += 1) {
    for (let t = 0; t < T; t += 1) {
      const p = cache.attn[h][t];
      const dP = [];
      for (let s = 0; s <= t; s += 1) {
        let dot = 0;
        for (let d = 0; d < Dh; d += 1) {
          dVv[s * D + h * Dh + d] += p[s] * dYh[t * D + h * Dh + d];
          dot += dYh[t * D + h * Dh + d] * cache.Vv[s * D + h * Dh + d];
        }
        dP.push(dot);
      }
      const sum = p.reduce((a, pi, i) => a + pi * dP[i], 0);
      const dS = p.map((pi, i) => pi * (dP[i] - sum));
      const scale = 1 / Math.sqrt(Dh);
      for (let s = 0; s <= t; s += 1) {
        for (let d = 0; d < Dh; d += 1) {
          dQ[t * D + h * Dh + d] += dS[s] * scale * cache.K[s * D + h * Dh + d];
          dK[s * D + h * Dh + d] += dS[s] * scale * cache.Q[t * D + h * Dh + d];
        }
      }
    }
  }

  for (let t = 0; t < T; t += 1) {
    const n = row(cache.N1, D, t);
    const dq = row(dQ, D, t);
    const dk = row(dK, D, t);
    const dv = row(dVv, D, t);
    for (let o = 0; o < D; o += 1) {
      for (let i = 0; i < D; i += 1) {
        g.Wq[o * D + i] += dq[o] * n[i];
        g.Wk[o * D + i] += dk[o] * n[i];
        g.Wv[o * D + i] += dv[o] * n[i];
      }
    }
    const dn = zeros(D);
    for (let i = 0; i < D; i += 1) {
      for (let o = 0; o < D; o += 1) {
        dn[i] += model.Wq[o * D + i] * dq[o] + model.Wk[o * D + i] * dk[o] + model.Wv[o * D + i] * dv[o];
      }
    }
    const dln1 = dLayerNorm(dn, cache.n1[t].hat, cache.n1[t].inv, model.ln1g);
    add_(g.ln1g, dln1.dg);
    add_(g.ln1b, dln1.db);
    add_(row(dX, D, t), dln1.dx);
  }

  for (let t = 0; t < T; t += 1) {
    const id = ids[t];
    for (let d = 0; d < D; d += 1) {
      const gxd = dX[t * D + d];
      g.tokE[id * D + d] += gxd;
      g.posE[t * D + d] += gxd;
    }
  }
  return g;
}

function sgd(model, g, lr) {
  for (const k of Object.keys(g)) {
    const w = model[k];
    const gw = g[k];
    for (let i = 0; i < w.length; i += 1) w[i] -= lr * gw[i];
  }
}

function clipSeq(ids, nPos) {
  if (ids.length <= nPos) return ids;
  return ids.slice(0, nPos);
}

function meanLoss(model, sequences) {
  let loss = 0;
  let n = 0;
  let tokens = 0;
  const t0 = Date.now();
  for (const ids of sequences) {
    const seq = clipSeq(ids, model.nPos);
    if (seq.length < 2) continue;
    const cache = forward(model, seq);
    const L = lossOn(cache.logits, seq);
    loss += L.loss * L.n;
    n += L.n;
    tokens += seq.length;
  }
  const ms = Math.max(Date.now() - t0, 1);
  return { loss: n ? loss / n : 0, perplexity: n ? Math.exp(Math.min(loss / n, 20)) : null, tokens, tokensPerSec: tokens / (ms / 1000), n };
}

function abortIfHot(startedAt) {
  if (process.memoryUsage().rss > RSS_LIMIT) return { abort: true, code: "RSS_LIMIT" };
  if (Date.now() - startedAt > TIME_LIMIT_MS) return { abort: true, code: "TIME_LIMIT" };
  return { abort: false };
}

function trainTransformer(model, sequences, { epochs = 2, lr = 0.05 } = {}) {
  const startedAt = Date.now();
  const cpu0 = process.cpuUsage();
  const rss0 = process.memoryUsage().rss;
  const losses = [];
  let aborted = null;
  for (let e = 0; e < epochs; e += 1) {
    const hot = abortIfHot(startedAt);
    if (hot.abort) {
      aborted = hot.code;
      break;
    }
    let epochLoss = 0;
    let n = 0;
    for (const ids of sequences) {
      const seq = clipSeq(ids, model.nPos);
      if (seq.length < 2) continue;
      const cache = forward(model, seq);
      const L = lossOn(cache.logits, seq);
      const g = backward(model, seq, cache);
      sgd(model, g, lr);
      epochLoss += L.loss * L.n;
      n += L.n;
    }
    losses.push(n ? epochLoss / n : 0);
  }
  const cpu = process.cpuUsage(cpu0);
  return {
    losses,
    aborted,
    ms: Date.now() - startedAt,
    rssDelta: process.memoryUsage().rss - rss0,
    cpuUserUs: cpu.user,
    params: paramCount(model),
    transformer: true,
    generalPurpose: false,
  };
}

function checkpoint(model) {
  const data = {
    vocabSize: model.vocabSize,
    dModel: model.dModel,
    nHeads: model.nHeads,
    nPos: model.nPos,
    dff: model.dff,
    architecture: model.architecture,
    arrays: {},
  };
  for (const k of Object.keys(model)) {
    if (model[k] instanceof Float64Array) data.arrays[k] = Array.from(model[k]);
  }
  const json = JSON.stringify(data);
  data.sha256 = crypto.createHash("sha256").update(json).digest("hex");
  data.bytes = Buffer.byteLength(json);
  return data;
}

function loadCheckpoint(data) {
  const m = createTransformer({
    vocabSize: data.vocabSize,
    dModel: data.dModel,
    nHeads: data.nHeads,
    nPos: data.nPos,
    dff: data.dff,
    seed: 1,
  });
  for (const k of Object.keys(data.arrays || {})) m[k].set(data.arrays[k]);
  return m;
}

function verifyCheckpoint(data) {
  const copy = { ...data };
  const sha = copy.sha256;
  delete copy.sha256;
  delete copy.bytes;
  const json = JSON.stringify({
    vocabSize: copy.vocabSize,
    dModel: copy.dModel,
    nHeads: copy.nHeads,
    nPos: copy.nPos,
    dff: copy.dff,
    architecture: copy.architecture,
    arrays: copy.arrays,
  });
  const got = crypto.createHash("sha256").update(json).digest("hex");
  return { ok: got === sha, expected: sha, got };
}

function greedyNext(model, ids) {
  const seq = clipSeq(ids, model.nPos);
  const cache = forward(model, seq);
  const last = cache.logits[seq.length - 1];
  const p = softmax(last);
  let best = 0;
  for (let i = 1; i < p.length; i += 1) if (p[i] > p[best]) best = i;
  return { nextId: best, p: p[best], generalPurpose: false };
}

module.exports = {
  createTransformer,
  paramCount,
  forward,
  trainTransformer,
  meanLoss,
  checkpoint,
  loadCheckpoint,
  verifyCheckpoint,
  greedyNext,
  RSS_LIMIT,
  TIME_LIMIT_MS,
};
