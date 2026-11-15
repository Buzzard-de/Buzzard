/**
 * Carrier integration security policy. Secrets never logged.
 */
function policy() {
  return {
    leastPrivilege: true,
    secretManagement: "NAMES_ONLY_NO_VALUES",
    auditLogging: true,
    rateLimiting: "CODE_READY_MOCK",
    webhookSignatureRequired: true,
    replayProtection: true,
    idempotency: true,
    dataMinimization: true,
    encryptionInTransitRequired: true,
    piiAccessControl: true,
    retentionPolicy: "UNKNOWN_NOT_PRODUCTION",
    disableSecurityOnCarrierError: false,
    shareCustomerAddressOnlyWhenShipping: true,
    storedSecretValues: 0,
  };
}

function credentialRegistry() {
  return {
    storedValues: 0,
    declaredNames: [],
    note: "No API secrets in repo or reports.",
  };
}

function healthMonitor({ outage = false } = {}) {
  return {
    status: outage ? "OUTAGE" : "UNKNOWN",
    live: false,
    lastProbe: "NOT_LIVE",
  };
}

function locateNetworks({ country, lockers = [], pudo = [] } = {}) {
  const iso = country === "GR" ? "EL" : country;
  return {
    country: iso || "UNKNOWN",
    lockers: lockers.filter((n) => !iso || n.country === iso),
    pudo: pudo.filter((n) => !iso || n.country === iso),
    live: false,
  };
}

module.exports = { policy, credentialRegistry, healthMonitor, locateNetworks };
