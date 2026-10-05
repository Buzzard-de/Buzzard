const ALLOWED_HOSTS = new Set([
  "api.openai.com",
  "api.deepgram.com",
  "api.elevenlabs.io",
  "api.twilio.com",
  "api.telnyx.com",
  "api.nexmo.com",
  "rest.nexmo.com",
  "api.plivo.com",
  "speech.googleapis.com",
  "texttospeech.googleapis.com",
]);

const ALLOWED_HOST_PATTERNS = [
  /^[a-z0-9-]+\.stt\.speech\.microsoft\.com$/i,
  /^[a-z0-9-]+\.tts\.speech\.microsoft\.com$/i,
  /^[a-z0-9-]+\.api\.cognitive\.microsoft\.com$/i,
  /^polly\.[a-z0-9-]+\.amazonaws\.com$/i,
];

function isPrivateHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host === "::1" || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  return false;
}

function assertAllowedUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url || ""));
  } catch {
    return { ok: false, code: "SSRF_BLOCKED" };
  }
  if (parsed.protocol !== "https:") return { ok: false, code: "SSRF_BLOCKED" };
  if (isPrivateHostname(parsed.hostname)) return { ok: false, code: "SSRF_BLOCKED" };
  if (ALLOWED_HOSTS.has(parsed.hostname)) return { ok: true, host: parsed.hostname };
  if (ALLOWED_HOST_PATTERNS.some((re) => re.test(parsed.hostname))) return { ok: true, host: parsed.hostname };
  const extras = [process.env.AVATAR_BASE_URL, process.env.VIDEO_BASE_URL]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).hostname.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  if (extras.includes(parsed.hostname.toLowerCase()) && !isPrivateHostname(parsed.hostname)) {
    return { ok: true, host: parsed.hostname, extra: true };
  }
  return { ok: false, code: "SSRF_BLOCKED", host: parsed.hostname };
}

module.exports = {
  assertAllowedUrl,
  ALLOWED_HOSTS,
};
