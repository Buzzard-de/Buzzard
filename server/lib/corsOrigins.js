const DEFAULT_ORIGINS = Object.freeze([
  "http://localhost:8000",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3040",
  "http://localhost:3010",
  "http://localhost:3002",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3040",
  "http://127.0.0.1:3010",
  "http://127.0.0.1:3002",
  "https://buzzard24.de",
  "https://www.buzzard24.de",
]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOOPBACK_PORTS = new Set(["3000", "3001", "3002", "3010", "3040", "8000"]);

function extraOrigins(raw = process.env.BUZZARD_CORS_ORIGINS) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getAllowedOrigins() {
  return new Set([...DEFAULT_ORIGINS, ...extraOrigins()]);
}

function isLoopbackHttpOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname) && LOOPBACK_PORTS.has(url.port);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === "null") {
    return extraOrigins().includes("null");
  }
  if (getAllowedOrigins().has(origin)) return true;
  if (process.env.NODE_ENV === "production" && process.env.BUZZARD_ALLOW_LOOPBACK_CORS !== "1") {
    return false;
  }
  return isLoopbackHttpOrigin(origin);
}

module.exports = {
  DEFAULT_ORIGINS,
  getAllowedOrigins,
  isAllowedOrigin,
};
