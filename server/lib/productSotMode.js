/**
 * Product SoT activation modes.
 * Default READ_TARGET. EXCLUSIVE requires explicit identity validation.
 * Does not flip sales or invent production access.
 */
const MODES = Object.freeze({
  READ_TARGET: "READ_TARGET",
  MIGRATION: "MIGRATION",
  EXCLUSIVE: "EXCLUSIVE",
});

function requestedMode() {
  const raw = String(process.env.BUZZARD_PRODUCT_SOT_MODE || MODES.READ_TARGET).toUpperCase();
  return MODES[raw] || MODES.READ_TARGET;
}

function isIdentityValidated() {
  return process.env.BUZZARD_PRODUCT_SOT_IDENTITY_VALIDATED === "1";
}

function resolveSotMode() {
  const requested = requestedMode();
  if (requested !== MODES.EXCLUSIVE) {
    return {
      mode: requested,
      requested,
      exclusive: false,
      blockedReason: null,
    };
  }
  if (!isIdentityValidated()) {
    return {
      mode: MODES.READ_TARGET,
      requested,
      exclusive: false,
      blockedReason: "BLOCKED_BY_PRODUCTION_ACCESS",
    };
  }
  return {
    mode: MODES.EXCLUSIVE,
    requested,
    exclusive: true,
    blockedReason: null,
  };
}

module.exports = { MODES, requestedMode, isIdentityValidated, resolveSotMode };
