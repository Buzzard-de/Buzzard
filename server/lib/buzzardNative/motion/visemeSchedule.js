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

function alignToAudio(phonemes, wav) {
  const buf = Buffer.isBuffer(wav) ? wav : Buffer.alloc(0);
  if (buf.slice(0, 4).toString("ascii") !== "RIFF" || buf.length < 44) {
    return { ok: false, code: "AUDIO_REQUIRED", lipSync: false, mesh: "NOT_CONFIGURED", cssFallback: false };
  }
  const pcmBytes = buf.readUInt32LE(40);
  const events = schedule(phonemes).events.map((event) => ({
    ...event,
    alignedToAudio: true,
    sampleIndex: Math.floor((event.atMs / 1000) * 8000),
  }));
  const inside = events.every((event) => event.sampleIndex < pcmBytes);
  return {
    ok: inside && events.length === (phonemes || []).length,
    events,
    lipSync: inside && events.length > 0,
    durationMs: (pcmBytes / 8000) * 1000,
    pcmBytes,
    mesh: "NOT_CONFIGURED",
    cssFallback: false,
  };
}

module.exports = { schedule, alignToAudio, MAP };
