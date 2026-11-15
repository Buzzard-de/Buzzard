/**
 * Deterministic acoustics on PCM16. Not TTS, not a clone, not Praat.
 */
function dftMag(frame, bin) {
  const n = frame.length;
  let re = 0;
  let im = 0;
  const w = (2 * Math.PI * bin) / n;
  for (let i = 0; i < n; i += 1) {
    re += frame[i] * Math.cos(w * i);
    im -= frame[i] * Math.sin(w * i);
  }
  return Math.hypot(re, im);
}

function bandPeakHz(frame, sampleRate, loHz, hiHz) {
  const n = frame.length;
  const lo = Math.max(1, Math.floor((loHz * n) / sampleRate));
  const hi = Math.min(n / 2 - 1, Math.ceil((hiHz * n) / sampleRate));
  let best = lo;
  let mag = -1;
  for (let k = lo; k <= hi; k += 1) {
    const m = dftMag(frame, k);
    if (m > mag) {
      mag = m;
      best = k;
    }
  }
  return { hz: (best * sampleRate) / n, mag };
}

function measurePcm(samples, sampleRate = 16000) {
  const nfft = 256;
  const hop = Math.floor(sampleRate / 100);
  const frames = [];
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    sumSq += samples[i] * samples[i];
  }
  const rms = samples.length ? Math.sqrt(sumSq / samples.length) : 0;
  const f1 = [];
  const f2 = [];
  const f3 = [];
  const centroids = [];
  const energy = [];
  for (let start = 0; start + nfft <= samples.length; start += hop) {
    const frame = samples.slice(start, start + nfft);
    let e = 0;
    for (const x of frame) e += x * x;
    const er = Math.sqrt(e / nfft);
    energy.push(Number(er.toFixed(5)));
    if (er < 0.02) continue;
    const b1 = bandPeakHz(frame, sampleRate, 200, 900);
    const b2 = bandPeakHz(frame, sampleRate, 800, 2500);
    const b3 = bandPeakHz(frame, sampleRate, 2200, 3500);
    f1.push(b1.hz);
    f2.push(b2.hz);
    f3.push(b3.hz);
    let num = 0;
    let den = 0;
    for (let k = 1; k < nfft / 2; k += 1) {
      const m = dftMag(frame, k);
      num += m * ((k * sampleRate) / nfft);
      den += m;
    }
    if (den > 0) centroids.push(num / den);
  }
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  return {
    sampleRate,
    samples: samples.length,
    durationSec: samples.length / sampleRate,
    peak: Number(peak.toFixed(5)),
    rms: Number(rms.toFixed(5)),
    voicedFrames: f1.length,
    spectralCentroidHz: mean(centroids) ? Number(mean(centroids).toFixed(1)) : null,
    formantsHz: {
      method: "256pt_dft_band_peak_not_lpc",
      f1: mean(f1) ? Number(mean(f1).toFixed(1)) : null,
      f2: mean(f2) ? Number(mean(f2).toFixed(1)) : null,
      f3: mean(f3) ? Number(mean(f3).toFixed(1)) : null,
      reliability: "coarse_band_peak",
    },
    envelope: energy.slice(0, 40),
    jitter: null,
    shimmer: null,
    hnr: null,
    clone: false,
    invented: false,
  };
}

function parseWavPcm16(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 44) return null;
  if (buf.slice(0, 4).toString("ascii") !== "RIFF") return null;
  const ch = buf.readUInt16LE(22);
  const rate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  if (bits !== 16) return { error: "not_pcm16", rate, bits, ch };
  const samples = [];
  for (let i = 44; i + 1 < buf.length; i += 2 * ch) {
    samples.push(buf.readInt16LE(i) / 32768);
  }
  return { samples, sampleRate: rate, channels: ch };
}

module.exports = { measurePcm, parseWavPcm16, bandPeakHz };
