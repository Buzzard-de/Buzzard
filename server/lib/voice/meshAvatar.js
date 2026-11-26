/**
 * Authored 3D head for a speaking member. Jaw and mouth morphs follow the waveform.
 * This is not a scanned body and not a photoreal digital human.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getAgent } = require("../buzzardNative/core/identityRegistry");

const POSES = Object.freeze(["idle", "listening", "thinking", "speaking"]);

function readGltf(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const meshes = Array.isArray(data.meshes) ? data.meshes.length : 0;
    if (!data.asset?.version || meshes < 1) return { ok: false };
    return { ok: true, version: data.asset.version, meshes, file: path.basename(file), format: "gltf" };
  } catch {
    return { ok: false };
  }
}

function readGlb(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.length < 20 || buf.toString("utf8", 0, 4) !== "glTF") return { ok: false };
    const version = buf.readUInt32LE(4);
    const jsonLength = buf.readUInt32LE(12);
    if (buf.toString("utf8", 16, 20) !== "JSON" || 20 + jsonLength > buf.length) return { ok: false };
    const data = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
    const meshes = Array.isArray(data.meshes) ? data.meshes.length : 0;
    if (!version || meshes < 1) return { ok: false };
    return { ok: true, version, meshes, file: path.basename(file), format: "glb" };
  } catch {
    return { ok: false };
  }
}

function readCharacter(file) {
  if (file.endsWith(".glb")) return readGlb(file);
  return readGltf(file);
}

const INDEX = Object.freeze([
  0, 1, 2,
  0, 2, 3,
  4, 5, 6,
  4, 6, 7,
]);

function seedFor(agentId) {
  const hex = crypto.createHash("sha256").update(String(agentId || "none")).digest();
  return hex[0] / 255;
}

function restMesh(agentId) {
  const spread = 0.9 + seedFor(agentId) * 0.2;
  return [
    [0, 0.22 * spread, 0.08],
    [-0.16 * spread, 0.08, 0.04],
    [0.16 * spread, 0.08, 0.04],
    [0, -0.02, 0.1],
    [-0.05 * spread, -0.04, 0.12],
    [0.05 * spread, -0.04, 0.12],
    [0, -0.08, 0.11],
    [0, -0.12, 0.08],
  ];
}

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
    let flips = 0;
    for (let i = 0; i < slice.length; i += 1) {
      energy += slice[i] * slice[i];
      if (i > 0 && (slice[i] >= 0) !== (slice[i - 1] >= 0)) flips += 1;
    }
    const rms = Math.sqrt(energy / Math.max(1, slice.length));
    frames.push({
      index: w,
      jaw: Math.max(0, Math.min(1, rms * 8)),
      mouth: Math.max(0, Math.min(1, flips / Math.max(8, slice.length))),
    });
  }
  return frames;
}

function deform(rest, frame) {
  return rest.map((vertex, index) => {
    if (index < 4) return vertex.slice();
    const jaw = index === 7 ? frame.jaw : frame.jaw * 0.45;
    const width = index === 4 || index === 5 ? frame.mouth : 0;
    const side = index === 4 ? -1 : index === 5 ? 1 : 0;
    return [
      vertex[0] + side * width * 0.04,
      vertex[1] - jaw * 0.18,
      vertex[2] + jaw * 0.05,
    ];
  });
}

function presentSpeaker({ agentId, wav, state = "speaking", gltfPath = null } = {}) {
  if (!agentId) {
    return { ok: false, code: "AGENT_REQUIRED", mesh: "NOT_CONFIGURED", is3d: false, photoreal: false, scannedBody: false, css: false, assetStatus: "BLOCKED_ASSET" };
  }
  const pose = POSES.includes(state) ? state : "speaking";
  const frames = pose === "speaking" ? mouthTrack(wav) : [{ index: 0, jaw: 0, mouth: 0 }];
  if (frames.length) frames.push({ index: frames.length, jaw: 0, mouth: 0, ended: true });
  const rest = restMesh(agentId);
  const peak = frames.reduce((best, frame) => (frame.jaw > best.jaw ? frame : best), { jaw: 0, mouth: 0, index: 0 });
  const open = deform(rest, peak);
  const closed = deform(rest, { jaw: 0, mouth: 0 });
  const moved = open[7][1] !== closed[7][1];
  const meshName = `council-head-${agentId}`;
  const registry = getAgent(agentId);
  const avatarDir = path.join(process.cwd(), "data", "models", "avatars");
  const assetFile = gltfPath || [path.join(avatarDir, `${agentId}.glb`), path.join(avatarDir, `${agentId}.gltf`)].find((file) => fs.existsSync(file));
  const loaded = assetFile && fs.existsSync(assetFile) ? readCharacter(assetFile) : { ok: false };
  const ended = frames.length > 0 && frames[frames.length - 1].jaw === 0;
  const speakingNow = false;
  return {
    ok: pose === "speaking" ? frames.length > 1 && moved && ended : ended,
    agentId,
    state: pose,
    avatarId: registry?.avatar_profile?.avatar_profile_id || null,
    voiceProfileId: registry?.voice_profile?.voice_profile_id || null,
    mesh: pose === "speaking" && !moved ? "NOT_CONFIGURED" : meshName,
    realModel: false,
    realCharacter: false,
    avatarComplete: false,
    assetStatus: loaded.ok ? "PARTIAL" : "BLOCKED_ASSET",
    gltf: loaded.ok ? loaded.file : null,
    previewMesh: loaded.ok !== true,
    placeholder: loaded.ok !== true,
    display: loaded.ok ? loaded.format : "NONE",
    lipSyncTarget: "PREVIEW_MESH",
    vertices: rest.length,
    triangles: INDEX.length / 3,
    indices: INDEX.length,
    morphTargets: ["jaw", "mouth"],
    is3d: loaded.ok === true,
    authored: true,
    scannedBody: false,
    css: false,
    digitalHuman: false,
    photoreal: false,
    lipSync: pose === "speaking" && moved,
    speaking: speakingNow,
    stopped: ended,
    peakJaw: peak.jaw,
    rest: closed[7],
    open: open[7],
    frames,
    meshHash: crypto.createHash("sha256").update(JSON.stringify({ agentId, rest })).digest("hex").slice(0, 16),
  };
}

module.exports = { presentSpeaker, restMesh, readGltf, readGlb, readCharacter, INDEX, POSES };
