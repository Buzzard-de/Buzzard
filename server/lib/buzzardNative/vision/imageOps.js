const crypto = require("crypto");
const { detectBlobs } = require("./blobDetect");
const { renderTextPng, ocrBitmap } = require("./bitmapFont");

function compare(a, b) {
  const ha = crypto.createHash("sha256").update(a).digest("hex");
  const hb = crypto.createHash("sha256").update(b).digest("hex");
  const n = Math.min(a.length, b.length);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) diff += 1;
  const ratio = diff / Math.max(a.length, b.length, 1);
  return { same: ha === hb, shaA: ha, shaB: hb, diffRatio: Number(ratio.toFixed(4)), understanding: false };
}

function relations(gray, width, height) {
  const d = detectBlobs(gray, width, height);
  const sorted = [...d.boxes].sort((x, y) => x.x - y.x);
  const rel = [];
  for (let i = 1; i < sorted.length; i += 1) {
    rel.push({ left: i - 1, right: i, dx: sorted[i].x - sorted[i - 1].x });
  }
  return { ...d, relations: rel, generalScene: false };
}

function videoFrames(frames) {
  const diffs = [];
  for (let i = 1; i < frames.length; i += 1) {
    diffs.push(compare(frames[i - 1], frames[i]));
  }
  return {
    n: frames.length,
    changed: diffs.filter((d) => !d.same).length,
    tracking: "FRAME_DIFF_NOT_GENERAL_TRACK",
    generalVideoUnderstand: false,
  };
}

function ocrLanguages() {
  const tr = ocrBitmap(renderTextPng("KEDI").png);
  const de = ocrBitmap(renderTextPng("AUTO").png);
  const en = ocrBitmap(renderTextPng("HELP").png);
  return {
    tr: { text: tr.text, pass: tr.text === "KEDI", generalOcr: false },
    de: { text: de.text, pass: de.text === "AUTO", generalOcr: false },
    en: { text: en.text, pass: en.text === "HELP", generalOcr: false },
  };
}

module.exports = { compare, relations, videoFrames, ocrLanguages };
