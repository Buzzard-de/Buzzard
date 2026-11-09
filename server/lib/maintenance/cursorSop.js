/**
 * Cursor maintenance SOP. Isolated only. No auto push/merge/deploy/pay.
 */
const FORBIDDEN_AUTO = Object.freeze([
  "push",
  "merge",
  "deploy",
  "production_data_write",
  "backup_delete",
  "security_policy_weaken",
  "enable_sales",
  "initiate_payment",
]);

function assessRuntime() {
  return {
    alwaysOn: false,
    sessionActive: true,
    licenseAssumed: false,
    monitoring24x7: false,
    note: "A Cursor session is not a 24/7 operations center.",
  };
}

function startWork({ isolatedBranch = true, userChangesPreserved = true } = {}) {
  if (!isolatedBranch) return { ok: false, code: "ISOLATION_REQUIRED" };
  return {
    ok: true,
    isolatedBranch,
    userChangesPreserved,
    forbiddenAuto: FORBIDDEN_AUTO,
    runtime: assessRuntime(),
  };
}

module.exports = { FORBIDDEN_AUTO, assessRuntime, startWork };
