/**
 * File record for the existing 17 members.
 * A missing personal voice or character file stays blocked. Nothing here is synthesized.
 */
const fs = require("fs");
const path = require("path");
const { ids } = require("../buzzardNative/core/identityRegistry");
const { readCharacter } = require("./meshAvatar");

const SHARED_VOICE = "tr_TR-antalia-medium.onnx";

function speechRoot() {
  return path.join(process.cwd(), "data", "models", "speech");
}

function avatarRoot() {
  return path.join(process.cwd(), "data", "models", "avatars");
}

function voicePath(agentId) {
  return path.join(speechRoot(), "members", `${agentId}.onnx`);
}

function avatarCandidates(agentId) {
  return [path.join(avatarRoot(), `${agentId}.glb`), path.join(avatarRoot(), `${agentId}.gltf`)];
}

function fileFacts(file) {
  if (!file || !fs.existsSync(file)) return { present: false, bytes: 0, file: null };
  const stat = fs.statSync(file);
  return { present: stat.isFile() && stat.size > 0, bytes: stat.size, file: path.relative(process.cwd(), file) };
}

function memberAssetRegistry() {
  return ids().map((agentId) => {
    const voice = fileFacts(voicePath(agentId));
    const avatarFile = avatarCandidates(agentId).find((file) => fs.existsSync(file)) || null;
    const avatar = fileFacts(avatarFile);
    const loaded = avatar.present ? readCharacter(avatarFile) : { ok: false };
    const voiceOwned = voice.present && path.basename(voice.file) === `${agentId}.onnx` && voice.bytes > 1024;
    const avatarOwned = loaded.ok === true && path.basename(avatar.file).startsWith(`${agentId}.`);
    return {
      agentId,
      personalVoice: voiceOwned ? "PARTIAL" : "BLOCKED_ASSET",
      voiceBytes: voiceOwned ? voice.bytes : 0,
      voiceFile: voiceOwned ? voice.file : null,
      voiceLicense: voiceOwned ? "UNSTATED" : null,
      ownVoice: false,
      sharedVoice: SHARED_VOICE,
      sharedIsPersonal: false,
      avatarAsset: avatarOwned ? "PARTIAL" : "BLOCKED_ASSET",
      avatarBytes: avatarOwned ? avatar.bytes : 0,
      avatarFile: avatarOwned ? avatar.file : null,
      avatarFormat: avatarOwned ? loaded.format : null,
      previewMesh: avatarOwned !== true,
      realCharacter: false,
      photoreal: false,
      digitalHuman: false,
    };
  });
}

function stageMemberAsset({ agentId, kind, bytes, root, license } = {}) {
  if (!ids().includes(agentId)) return { ok: false, code: "MEMBER_UNKNOWN", stored: false, ownVoice: false };
  if (!root) return { ok: false, code: "ROOT_REQUIRED", stored: false, ownVoice: false };
  if (!license || !String(license).trim()) return { ok: false, code: "LICENSE_REQUIRED", stored: false, ownVoice: false };
  if (!Buffer.isBuffer(bytes) || bytes.length < 32) return { ok: false, code: "INVALID_ASSET", stored: false, ownVoice: false };
  const base = path.resolve(root);
  const destination = kind === "voice"
    ? path.join(base, "speech", "members", `${agentId}.onnx`)
    : path.join(base, "avatars", `${agentId}.gltf`);
  if (!destination.startsWith(`${base}${path.sep}`)) return { ok: false, code: "AGENT_MISMATCH", stored: false, ownVoice: false };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  const checked = kind === "voice"
    ? (bytes.length > 1024 && bytes.some((value) => value !== 0)
      ? { ok: true }
      : { ok: false, code: "INVALID_ASSET" })
    : readCharacter(destination);
  if (!checked.ok) {
    fs.unlinkSync(destination);
    return { ok: false, code: checked.code || "INVALID_ASSET", stored: false, ownVoice: false, agentId };
  }
  return {
    ok: true,
    code: kind === "voice" ? "VOICE_FILE" : "AVATAR_FILE",
    stored: true,
    agentId,
    file: destination,
    license: String(license).trim(),
    ownVoice: false,
    personal: false,
    realCharacter: false,
    photoreal: false,
    digitalHuman: false,
    sharedVoice: SHARED_VOICE,
  };
}

function validateMemberFile({ agentId, kind, filePath } = {}) {
  if (!ids().includes(agentId)) return { ok: false, code: "MEMBER_UNKNOWN", accepted: false };
  if (!filePath) return { ok: false, code: "FILE_REQUIRED", accepted: false };
  const resolved = path.resolve(filePath);
  const expected = kind === "voice" ? [path.resolve(voicePath(agentId))] : avatarCandidates(agentId).map((file) => path.resolve(file));
  if (!expected.includes(resolved)) return { ok: false, code: "AGENT_MISMATCH", accepted: false, agentId };
  if (!fs.existsSync(resolved)) return { ok: false, code: "BLOCKED_ASSET", accepted: false, agentId };
  if (kind === "voice") {
    const size = fs.statSync(resolved).size;
    if (size <= 1024 || !resolved.endsWith(".onnx")) return { ok: false, code: "INVALID_ASSET", accepted: false, bytes: size };
    return { ok: true, code: "VOICE_FILE", accepted: true, agentId, bytes: size, ownVoice: false, license: "UNSTATED" };
  }
  const loaded = readCharacter(resolved);
  if (!loaded.ok) return { ok: false, code: "AVATAR_LOAD_FAILED", accepted: false, agentId };
  return { ok: true, code: "AVATAR_FILE", accepted: true, agentId, format: loaded.format, realCharacter: false, photoreal: false };
}

module.exports = { memberAssetRegistry, validateMemberFile, stageMemberAsset, voicePath, SHARED_VOICE };
