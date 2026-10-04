/**
 * Feature flags for the unified AI orchestrator.
 * Voice and phone stay OFF unless explicitly enabled.
 */

function envFlag(name) {
  return process.env[name] === "1" || process.env[name] === "true";
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getFlags() {
  return Object.freeze({
    ORCHESTRATOR_ENABLED: envFlag("ORCHESTRATOR_ENABLED"),
    VOICE_ENABLED: envFlag("VOICE_ENABLED"),
    PHONE_ENABLED: envFlag("PHONE_ENABLED"),
    OUTBOUND_CALL_ENABLED: envFlag("OUTBOUND_CALL_ENABLED"),
    INBOUND_CALL_ENABLED: envFlag("INBOUND_CALL_ENABLED"),
    CALL_RECORDING_ENABLED: envFlag("CALL_RECORDING_ENABLED"),
    HUMAN_HANDOFF_ENABLED: envFlag("HUMAN_HANDOFF_ENABLED") || true,
    MOCK_TELEPHONY: !isProduction() && (envFlag("MOCK_TELEPHONY") || !process.env.TELEPHONY_ACCOUNT_SID),
  });
}

function requireOrchestrator() {
  return getFlags().ORCHESTRATOR_ENABLED;
}

module.exports = {
  envFlag,
  isProduction,
  getFlags,
  requireOrchestrator,
};
