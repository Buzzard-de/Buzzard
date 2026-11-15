/**
 * Extra acoustics on PCM16. Analysis only. Not clone training.
 */
function periods(samples, sampleRate, lo = 60, hi = 300) {
  const minLag = Math.floor(sampleRate / hi);
  const maxLag = Math.floor(sampleRate / lo);
  const win = Math.floor(sampleRate * 0.04);
  const hop = Math.floor(sampleRate * 0.01);
  const f0 = [];
  const amps = [];
  for (let s = 0; s + win < samples.length; s += hop) {
    const frame = samples.slice(s, s + win);
    let energy = 0;
    for (const x of frame) energy += x * x;
    if (Math.sqrt(energy / win) < 0.02) continue;
    let best = minLag;
    let bestC = -1;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let c = 0;
      for (let i = 0; i + lag < win; i += 1) c += frame[i] * frame[i + lag];
      if (c > bestC) {
        bestC = c;
        best = lag;
      }
    }
    f0.push(sampleRate / best);
    let peak = 0;
    for (const x of frame) peak = Math.max(peak, Math.abs(x));
    amps.push(peak);
  }
  return { f0, amps };
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function stdev(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function measureVoice(samples, sampleRate = 16000) {
  const { f0, amps } = periods(samples, sampleRate);
  const sorted = [...f0].sort((a, b) => a - b);
  const jitter = f0.length > 1 ? stdev(f0) / (mean(f0) || 1) : null;
  const shimmer = amps.length > 1 ? stdev(amps) / (mean(amps) || 1) : null;
  let harm = 0;
  let res = 0;
  const hop = Math.floor(sampleRate * 0.04);
  for (let i = 0; i + hop < samples.length; i += hop) {
    const e = samples.slice(i, i + hop).reduce((a, b) => a + b * b, 0);
    if (e > 0.0004) harm += e;
    else res += e;
  }
  const hnrDb = harm > 0 ? 10 * Math.log10(harm / (res + 1e-9)) : null;
  const voiced = f0.length;
  const hop10 = Math.floor(sampleRate * 0.01);
  const frames = Math.max(1, Math.floor((samples.length - Math.floor(sampleRate * 0.04)) / hop10));
  const silence = 1 - voiced / frames;
  return {
    f0Hz: {
      mean: mean(f0) ? Number(mean(f0).toFixed(2)) : null,
      min: sorted[0] ? Number(sorted[0].toFixed(2)) : null,
      max: sorted.length ? Number(sorted[sorted.length - 1].toFixed(2)) : null,
      stdev: stdev(f0) ? Number(stdev(f0).toFixed(2)) : null,
      n: f0.length,
      method: "autocorr_40ms_hop10ms_60_300",
      invented: false,
    },
    jitterLocal: jitter != null ? Number(jitter.toFixed(4)) : null,
    shimmerLocal: shimmer != null ? Number(shimmer.toFixed(4)) : null,
    hnrDb: hnrDb != null ? Number(hnrDb.toFixed(2)) : null,
    silenceRatio: silence >= 0 && silence <= 1 ? Number(silence.toFixed(3)) : null,
    speakingRateHz: Number((voiced / (samples.length / sampleRate || 1)).toFixed(2)),
    hnrMethod: "voiced_vs_unvoiced_energy_not_true_hnr",
    clone: false,
    reliability: "relative_metrics_not_praat",
  };
}

module.exports = { measureVoice };
