const MAP = Object.freeze({
  a: "A",
  e: "E",
  i: "I",
  o: "O",
  u: "U",
  ɯ: "I",
  ø: "O",
  y: "U",
  _: "REST",
});

function schedule(phonemes, msEach = 40) {
  const events = (phonemes || []).map((p, i) => ({
    atMs: i * msEach,
    viseme: MAP[p] || "X",
    phoneme: p,
    alignedToAudio: false,
  }));
  return {
    ok: true,
    events,
    lipSync: false,
    lipSyncPass: false,
    kind: "VISEME_TIMELINE_NOT_AUDIO_ALIGNED",
  };
}

module.exports = { schedule, MAP };
