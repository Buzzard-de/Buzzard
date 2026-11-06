/**
 * MC12 service-verification ladder. Licence ≠ parcel ≠ last-mile ≠ own fleet ≠ live.
 */
const SERVICE_STATUS = Object.freeze([
  "UNKNOWN",
  "REGISTER_ONLY",
  "ACTIVE_BUSINESS_VERIFIED",
  "PARCEL_SERVICE_VERIFIED",
  "LAST_MILE_VERIFIED",
  "OWN_FLEET_VERIFIED",
  "SUBCONTRACTOR_NETWORK_VERIFIED",
  "API_DOCUMENTED",
  "SANDBOX_VERIFIED",
  "LIVE_CONTRACT_READY",
]);

function serviceStatus(entity) {
  const ev = entity.evidence || {};
  let status = "UNKNOWN";
  if (entity.legalName) status = "REGISTER_ONLY";
  if (ev.evidence_level === "LEGAL_ENTITY_NAMED") status = "REGISTER_ONLY";
  if (entity.activityVerified || ev.evidence_level === "ACTIVE_BUSINESS_VERIFIED") {
    status = "ACTIVE_BUSINESS_VERIFIED";
  }
  if (entity.parcel_service_verified === "PARCEL_SERVICE_VERIFIED") status = "PARCEL_SERVICE_VERIFIED";
  if (ev.evidence_level === "LAST_MILE_VERIFIED") status = "LAST_MILE_VERIFIED";
  if (entity.own_fleet_status === "OWN_FLEET_VERIFIED") status = "OWN_FLEET_VERIFIED";
  return {
    status,
    parcel_service_verified: entity.parcel_service_verified === "PARCEL_SERVICE_VERIFIED",
    last_mile_verified: false,
    own_fleet_verified: entity.own_fleet_status === "OWN_FLEET_VERIFIED",
    subcontractor_network_verified: false,
    api_documented: false,
    sandbox_verified: false,
    live_contract_ready: false,
    coverageGranularity: "UNKNOWN",
    evidence_url: Array.isArray(entity.sources) ? entity.sources[0] : "UNKNOWN",
    last_verified_at: "2026-11-06",
    note: "Register class, USP designation, or a website mention is not parcel/last-mile/own-fleet proof.",
  };
}

function countStatuses(entities) {
  const out = Object.fromEntries(SERVICE_STATUS.map((s) => [s, 0]));
  for (const e of entities) {
    const st = e.serviceVerification?.status || serviceStatus(e).status;
    out[st] = (out[st] || 0) + 1;
  }
  return out;
}

module.exports = { SERVICE_STATUS, serviceStatus, countStatuses };
