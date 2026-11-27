/**
 * Speech-to-text slot. No engine transcribes audio in this process.
 */
const LANGUAGES = new Set(["tr", "de", "en", "ar"]);

function transcribe({ audio = null, lang = "tr", timeoutMs = null } = {}) {
  if (timeoutMs === 0) {
    return { ok: false, code: "STT_TIMEOUT", transcript: null, sttReady: false, lang, stored: false };
  }
  const empty = audio == null || audio === "" || (Buffer.isBuffer(audio) && audio.length === 0);
  if (empty) {
    return { ok: false, code: "EMPTY_AUDIO", transcript: null, sttReady: false, lang, stored: false };
  }
  if (!LANGUAGES.has(lang)) {
    return { ok: false, code: "LANGUAGE_SLOT_UNKNOWN", transcript: null, sttReady: false, lang, stored: false };
  }
  return { ok: false, code: "PROVIDER_ABSENT", transcript: null, sttReady: false, lang, stored: false };
}

module.exports = { transcribe, LANGUAGES };
