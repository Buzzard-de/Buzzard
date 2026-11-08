function validateAudio(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!buf.length) return { ok: false, code: "EMPTY_AUDIO", stt: false };
  if (buf.length >= 12 && buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WAVE") {
    return { ok: true, format: "wav", bytes: buf.length, stt: false, note: "header_only_not_transcription" };
  }
  if (buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp") {
    return { ok: true, format: "m4a", bytes: buf.length, stt: false, note: "container_header_not_transcription" };
  }
  return { ok: false, code: "UNSUPPORTED_OR_CORRUPT_AUDIO", stt: false, bytes: buf.length };
}

function languageHint(text) {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text || "")) return "tr";
  if (/[äöüßÄÖÜ]/.test(text || "")) return "de";
  return "unknown";
}

module.exports = { validateAudio, languageHint };
