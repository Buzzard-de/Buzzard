/**
 * npm/pip belong to operator install time, not application runtime.
 * This module does not download, upgrade, or delete packages.
 */
const RUNTIME_POLICY = Object.freeze({
  npmAtRuntime: false,
  pipAtRuntime: false,
  autoUpgrade: false,
  budgetEur: 0,
});

function assertNotPackageManager(cmd) {
  const name = String(cmd || "").toLowerCase();
  if (/\b(npm|npx|pip3?|poetry)\b/.test(name)) {
    return { ok: false, code: "PACKAGE_MANAGER_RUNTIME_DENIED" };
  }
  return { ok: true };
}

module.exports = { RUNTIME_POLICY, assertNotPackageManager };
