/**
 * Byte-level tokenizer with optional BPE merges trained on Buzzard corpus.
 * Not a downloaded SentencePiece/tiktoken vocabulary.
 */
function bytesOf(text) {
  return Array.from(Buffer.from(String(text), "utf8"));
}

function fromBytes(ids) {
  return Buffer.from(ids).toString("utf8");
}

function pairKey(a, b) {
  return `${a}\t${b}`;
}

function countPairs(seqs) {
  const counts = new Map();
  for (const seq of seqs) {
    for (let i = 0; i < seq.length - 1; i += 1) {
      const k = pairKey(seq[i], seq[i + 1]);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return counts;
}

function applyMerge(seq, a, b, nid) {
  const out = [];
  for (let i = 0; i < seq.length; i += 1) {
    if (i < seq.length - 1 && seq[i] === a && seq[i + 1] === b) {
      out.push(nid);
      i += 1;
    } else out.push(seq[i]);
  }
  return out;
}

function trainByteBpe(texts, merges = 32) {
  let seqs = texts.map(bytesOf);
  const mergeList = [];
  let nextId = 256;
  for (let n = 0; n < merges; n += 1) {
    const counts = countPairs(seqs);
    let best = null;
    let bestN = 0;
    for (const [k, v] of counts) {
      if (v > bestN) {
        best = k;
        bestN = v;
      }
    }
    if (!best || bestN < 2) break;
    const [a, b] = best.split("\t").map(Number);
    mergeList.push([a, b, nextId]);
    seqs = seqs.map((s) => applyMerge(s, a, b, nextId));
    nextId += 1;
  }
  return { merges: mergeList, vocabSize: nextId, source: "buzzard_byte_bpe", downloaded: false };
}

function encode(text, model) {
  let seq = bytesOf(text);
  for (const [a, b, nid] of model.merges || []) seq = applyMerge(seq, a, b, nid);
  return seq;
}

function decode(ids, model) {
  const reverse = new Map((model.merges || []).map(([a, b, nid]) => [nid, [a, b]]));
  let seq = [...ids];
  let changed = true;
  while (changed) {
    changed = false;
    const out = [];
    for (const id of seq) {
      if (reverse.has(id)) {
        out.push(...reverse.get(id));
        changed = true;
      } else out.push(id);
    }
    seq = out;
  }
  return fromBytes(seq.filter((x) => x >= 0 && x < 256));
}

function roundtrip(text, model) {
  const ids = encode(text, model);
  const back = decode(ids, model);
  const raw = bytesOf(text).length;
  return {
    ok: back === text,
    original: text,
    roundtrip: back,
    tokens: ids.length,
    rawBytes: raw,
    compression: raw ? ids.length / raw : 1,
  };
}

module.exports = { bytesOf, trainByteBpe, encode, decode, roundtrip };
