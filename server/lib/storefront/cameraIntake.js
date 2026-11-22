/**
 * Mobile camera intake. The frame is checked and then dropped. Nothing is stored or fetched.
 */
const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 2_000_000;

function acceptCameraFrame({ consentPhoto, mime, byteLength, remoteUrl } = {}) {
  const refused = { ok: false, stored: false, live: false, accepted: false };
  if (remoteUrl) return { ...refused, code: "REMOTE_FETCH_DENIED" };
  if (consentPhoto !== true) return { ...refused, code: "CONSENT_REQUIRED" };
  if (!ALLOWED_MIME.has(mime)) return { ...refused, code: "MIME_NOT_ALLOWED" };
  if (!Number.isInteger(byteLength) || byteLength <= 0 || byteLength > MAX_BYTES) {
    return { ...refused, code: "SIZE_NOT_ALLOWED" };
  }
  return {
    ok: true,
    code: "FRAME_ACCEPTED_NOT_STORED",
    stored: false,
    live: false,
    accepted: true,
    mime,
    byteLength,
  };
}

module.exports = { ALLOWED_MIME, MAX_BYTES, acceptCameraFrame };
