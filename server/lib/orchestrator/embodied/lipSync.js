const VISEMES = Object.freeze({
  a: "aa",
  e: "E",
  i: "ih",
  o: "oh",
  u: "ou",
  m: "PP",
  b: "PP",
  p: "PP",
  f: "FF",
  v: "FF",
  s: "SS",
  t: "DD",
  d: "DD",
  n: "nn",
  l: "nn",
  k: "kk",
  g: "kk",
  r: "RR",
  w: "ou",
  y: "ih",
});

function visemesFromText(text) {
  const raw = String(text || "").toLowerCase();
  const frames = [];
  for (const ch of raw) {
    if (/\s/.test(ch)) {
      frames.push({ viseme: "sil", weight: 0.1 });
      continue;
    }
    frames.push({ viseme: VISEMES[ch] || "neutral", weight: 0.6 });
  }
  return { ok: true, frames, realtime: false, source: "grapheme-approx" };
}

function syncWithAudio({ text, audioPresent, ttsLive }) {
  const visemes = visemesFromText(text);
  return {
    ...visemes,
    audioPresent: Boolean(audioPresent),
    ttsLive: Boolean(ttsLive),
    claimedLiveHuman: false,
    jaw: ttsLive && audioPresent ? "synced" : "idle",
  };
}

module.exports = { visemesFromText, syncWithAudio, VISEMES };
