/**
 * Health probes use a dedicated rate-limit bucket.
 * Keep this independent of the general API limiter.
 */

function isHealthPath(pathname) {
  return pathname === "/api/health" || pathname.startsWith("/api/health/");
}

module.exports = { isHealthPath };
