/**
 * Part 24 — Immutable release manifest (no live activation flags).
 */
function buildReleaseManifest({
  version,
  commit,
  generatedAt = new Date().toISOString(),
} = {}) {
  return {
    version: version ?? "unknown",
    commit: commit ?? "unknown",
    generatedAt,
    immutable: true,
    supplierLiveImport: false,
    salesEnabled: false,
    paymentActivation: false,
  };
}

module.exports = {
  buildReleaseManifest,
};
