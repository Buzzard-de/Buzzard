/**
 * Buzzard-owned capability registry. External production AI (Claude etc.) is forbidden.
 */
const FORBIDDEN_PRODUCTION_PROVIDERS = Object.freeze(["anthropic", "claude", "claude-code", "openai", "google"]);

const CAPABILITIES = Object.freeze([
  { id: "version_control", owner: "buzzard", status: "CODE_READY" },
  { id: "documentation", owner: "buzzard", status: "CODE_READY" },
  { id: "automated_tests", owner: "buzzard", status: "COMPLETE" },
  { id: "security_review_checklist", owner: "buzzard", status: "CODE_READY" },
  { id: "performance_measure", owner: "buzzard", status: "PARTIAL" },
  { id: "shared_capability_pool", owner: "buzzard", status: "CODE_READY" },
  { id: "role_based_access", owner: "buzzard", status: "COMPLETE" },
]);

function assertIndependentRuntime(provider) {
  const name = String(provider || "").toLowerCase();
  if (FORBIDDEN_PRODUCTION_PROVIDERS.includes(name)) {
    let esat = null;
    try {
      esat = require("../security/esatBey").watchExternalAi(name);
    } catch {
      /* monitor is optional if the module is mid-load */
    }
    return {
      ok: false,
      code: "EXTERNAL_AI_FORBIDDEN",
      provider: name,
      esat,
      message: "External model accounts must not attach to Buzzard production AI.",
    };
  }
  return { ok: true, provider: name || "stub" };
}

function poolFor(roleId) {
  return CAPABILITIES.filter((c) => c.owner === "buzzard").map((c) => ({ ...c, grantedTo: roleId }));
}

module.exports = {
  FORBIDDEN_PRODUCTION_PROVIDERS,
  CAPABILITIES,
  assertIndependentRuntime,
  poolFor,
};
