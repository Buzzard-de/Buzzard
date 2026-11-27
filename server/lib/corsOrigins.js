/**
 * Browser origins allowed to read API responses.
 * The literal origin "null" (file:// and sandboxed frames) is trusted only when
 * it is named in BUZZARD_CORS_ORIGINS.
 */
const DEFAULT_ORIGINS = Object.freeze([
  "http://localhost:8000",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://buzzard24.de",
  "https://www.buzzard24.de",
]);

function allowedOrigins(env = process.env) {
  const extra = String(env.BUZZARD_CORS_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

function originAllowed(origin, env = process.env) {
  return typeof origin === "string" && origin.length > 0 && allowedOrigins(env).has(origin);
}

module.exports = { DEFAULT_ORIGINS, allowedOrigins, originAllowed };
