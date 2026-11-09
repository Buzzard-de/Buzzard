/**
 * Executive council size is owner-configurable. Not auto-decided.
 * Allowed values: 5, 7, 17. Default 17 (full native seed).
 */
const ALLOWED_SIZES = Object.freeze([5, 7, 17]);

function executiveSize({ env = process.env } = {}) {
  const raw = env.BUZZARD_COUNCIL_EXECUTIVE_SIZE;
  if (raw == null || raw === "") {
    return { size: 17, source: "DEFAULT_FULL_SEED", decidedByOwner: false };
  }
  const n = Number(raw);
  if (!ALLOWED_SIZES.includes(n)) {
    return { size: 17, source: "INVALID_FALLBACK_DEFAULT", decidedByOwner: false, rejected: raw };
  }
  return { size: n, source: "OWNER_ENV", decidedByOwner: true };
}

module.exports = { ALLOWED_SIZES, executiveSize };
