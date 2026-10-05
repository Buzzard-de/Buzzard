const STATES = Object.freeze({
  SILENCE: "SILENCE",
  REST: "REST",
  A: "A",
  E: "E",
  I: "I",
  O: "O",
  U: "U",
  M_B_P: "M_B_P",
  F_V: "F_V",
  TH: "TH",
  S_Z: "S_Z",
  SH_CH: "SH_CH",
  K_G: "K_G",
  R: "R",
  L: "L",
  N_D_T: "N_D_T",
  W_Q: "W_Q",
});

const CHAR_MAP = {
  a: "A",
  e: "E",
  i: "I",
  o: "O",
  u: "U",
  ä: "E",
  ö: "O",
  ü: "U",
  m: "M_B_P",
  b: "M_B_P",
  p: "M_B_P",
  f: "F_V",
  v: "F_V",
  w: "W_Q",
  q: "W_Q",
  s: "S_Z",
  z: "S_Z",
  c: "S_Z",
  ş: "SH_CH",
  j: "SH_CH",
  k: "K_G",
  g: "K_G",
  r: "R",
  l: "L",
  n: "N_D_T",
  d: "N_D_T",
  t: "N_D_T",
  θ: "TH",
};

function classifyChar(ch) {
  if (!ch || /\s/.test(ch)) return STATES.SILENCE;
  return CHAR_MAP[ch.toLowerCase()] || STATES.REST;
}

function durationFromAudio({ durationMs, audioBytes, sampleRate }) {
  if (Number(durationMs) > 0) return Number(durationMs);
  if (audioBytes && sampleRate) {
    return Math.round((Number(audioBytes) / Math.max(1, Number(sampleRate) * 2)) * 1000);
  }
  return null;
}

function buildTimeline({ text, durationMs, audioBytes, sampleRate, nativeLipSync } = {}) {
  const raw = String(text || "");
  const units = raw.length ? [...raw] : [" "];
  const audioMs = durationFromAudio({ durationMs, audioBytes, sampleRate });
  const audioLocked = Boolean(audioMs);
  const slot = audioMs ? audioMs / units.length : 80;
  let t = 0;
  const frames = units.map((ch) => {
    const viseme = classifyChar(ch);
    const startMs = Math.round(t);
    t += slot;
    const endMs = Math.round(t);
    return {
      viseme,
      startMs,
      endMs,
      jaw: viseme === "A" || viseme === "O" ? 0.7 : viseme === "SILENCE" ? 0.05 : 0.35,
      mouth: viseme,
    };
  });
  return {
    ok: true,
    frames,
    audioLocked,
    native: Boolean(nativeLipSync),
    source: nativeLipSync ? "provider-native" : audioLocked ? "audio-locked-viseme" : "grapheme-unscheduled",
    durationMs: audioMs || frames[frames.length - 1]?.endMs || 0,
    claimedLiveHuman: false,
    random: false,
  };
}

function silence() {
  return {
    ok: true,
    frames: [{ viseme: STATES.SILENCE, startMs: 0, endMs: 0, jaw: 0.05, mouth: STATES.SILENCE }],
    audioLocked: true,
    interrupted: true,
    source: "interrupt",
  };
}

function visemeAt(timeline, timeMs) {
  if (!timeline?.frames?.length) return STATES.SILENCE;
  const t = Number(timeMs) || 0;
  const hit = timeline.frames.find((frame) => t >= frame.startMs && t < frame.endMs);
  return hit?.viseme || timeline.frames[timeline.frames.length - 1].viseme;
}

module.exports = {
  STATES,
  classifyChar,
  buildTimeline,
  silence,
  visemeAt,
  durationFromAudio,
};
