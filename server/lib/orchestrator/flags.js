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
  const inbound = envFlag("INBOUND_CALL_ENABLED") || envFlag("PHONE_INBOUND_ENABLED");
  const outbound = envFlag("OUTBOUND_CALL_ENABLED") || envFlag("PHONE_OUTBOUND_ENABLED");
  return Object.freeze({
    ORCHESTRATOR_ENABLED: envFlag("ORCHESTRATOR_ENABLED"),
    VOICE_ENABLED: envFlag("VOICE_ENABLED"),
    VOICE_WEBRTC_ENABLED: envFlag("VOICE_WEBRTC_ENABLED"),
    PHONE_ENABLED: envFlag("PHONE_ENABLED"),
    OUTBOUND_CALL_ENABLED: outbound,
    INBOUND_CALL_ENABLED: inbound,
    PHONE_OUTBOUND_ENABLED: outbound,
    PHONE_INBOUND_ENABLED: inbound,
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
