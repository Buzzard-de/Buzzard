/**
 * Small authored 3D head. Mouth vertices move from the real waveform, not from CSS.
 */
const crypto = require("crypto");

const BASE = Object.freeze([
  [0, 0.2, 0.1],
  [-0.15, 0, 0.05],
  [0.15, 0, 0.05],
  [0, -0.02, 0.08],
]);
const JAW = Object.freeze([0, -0.28, 0.16]);

function pcmSamples(wav) {
  if (!Buffer.isBuffer(wav) || wav.length < 46) return [];
  const samples = [];
  for (let i = 44; i + 1 < wav.length; i += 2) samples.push(wav.readInt16LE(i) / 32768);
  return samples;
}

function mouthTrack(wav, windows = 8) {
  const samples = pcmSamples(wav);
  if (!samples.length) return [];
  const size = Math.max(1, Math.floor(samples.length / windows));
  const frames = [];
  for (let w = 0; w < windows; w += 1) {
    const slice = samples.slice(w * size, (w + 1) * size);
    let energy = 0;
    for (const sample of slice) energy += sample * sample;
    const rms = Math.sqrt(energy / Math.max(1, slice.length));
    frames.push({ index: w, weight: Math.max(0, Math.min(1, rms * 8)) });
  }
  return frames;
}

function vertexAt(weight) {
  const lip = BASE[3];
  return [
    lip[0] + (JAW[0] - lip[0]) * weight,
    lip[1] + (JAW[1] - lip[1]) * weight,
    lip[2] + (JAW[2] - lip[2]) * weight,
  ];
}

function presentSpeaker({ agentId, wav } = {}) {
  const frames = mouthTrack(wav);
  const peak = frames.reduce((max, frame) => Math.max(max, frame.weight), 0);
  const rest = vertexAt(0);
  const open = vertexAt(peak);
  const moved = open[1] !== rest[1];
  return {
    ok: frames.length > 0 && moved,
    agentId,
    mesh: "council-head",
    vertices: BASE.length,
    is3d: true,
    scannedBody: false,
    css: false,
    digitalHuman: moved,
    photoreal: false,
    lipSync: moved,
    peak,
    rest,
    open,
    frames,
    speaking: peak > 0.02,
    meshHash: crypto.createHash("sha256").update(JSON.stringify(BASE)).digest("hex").slice(0, 16),
  };
}

module.exports = { presentSpeaker, vertexAt, BASE };
