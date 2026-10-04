const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/flac",
]);

function normalizeAudio(audio) {
  if (!audio) return { ok: false, code: "AUDIO_MISSING" };
  let buf;
  let mime = "audio/webm";
  let filename = "audio.webm";
  let durationMs = null;

  if (Buffer.isBuffer(audio)) {
    buf = audio;
  } else if (typeof audio === "string") {
    if (audio.startsWith("data:")) {
      const [meta, b64] = audio.split(",");
      mime = meta.match(/data:([^;]+)/)?.[1] || mime;
      buf = Buffer.from(b64 || "", "base64");
    } else {
      buf = Buffer.from(audio, "base64");
    }
  } else if (typeof audio === "object") {
    const raw = audio.buffer || audio.data || audio.bytes || audio.audio;
    if (!raw) return { ok: false, code: "AUDIO_MISSING" };
    buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, audio.encoding || "base64");
    mime = audio.mimeType || audio.mime || mime;
    filename = audio.filename || filename;
    durationMs = audio.durationMs != null ? Number(audio.durationMs) : null;
  } else {
    return { ok: false, code: "AUDIO_FORMAT_UNSUPPORTED" };
  }

  const maxBytes = Number(process.env.STT_MAX_BYTES || 25 * 1024 * 1024);
  if (!buf.length) return { ok: false, code: "AUDIO_MISSING" };
  if (buf.length > maxBytes) return { ok: false, code: "AUDIO_TOO_LARGE" };

  const maxDuration = Number(process.env.STT_MAX_DURATION_MS || 120000);
  if (durationMs != null && Number.isFinite(durationMs) && durationMs > maxDuration) {
    return { ok: false, code: "AUDIO_TOO_LONG" };
  }
  if (audio && typeof audio === "object" && audio.mimeType && !ALLOWED_MIME.has(audio.mimeType) && !ALLOWED_MIME.has(mime)) {
    return { ok: false, code: "AUDIO_FORMAT_UNSUPPORTED" };
  }

  return { ok: true, buf, mime, filename, durationMs, size: buf.length };
}

module.exports = {
  normalizeAudio,
  ALLOWED_MIME,
};
