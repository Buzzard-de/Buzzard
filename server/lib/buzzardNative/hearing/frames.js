function frameEnergy(samples, sampleRate = 8000, ms = 20) {
  const hop = Math.max(1, Math.floor((sampleRate * ms) / 1000));
  const out = [];
  for (let i = 0; i + hop <= samples.length; i += hop) {
    let e = 0;
    for (let j = 0; j < hop; j += 1) e += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(e / hop);
    out.push({ i, rms, voiceLikely: rms > 0.02 });
  }
  return {
    frames: out,
    voiced: out.filter((f) => f.voiceLikely).length,
    stt: false,
    transcription: null,
  };
}

module.exports = { frameEnergy };
