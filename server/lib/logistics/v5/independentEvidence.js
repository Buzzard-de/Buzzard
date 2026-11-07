/**
 * Independent evidence flags. Unproven fields stay UNKNOWN, never false-as-zero market counts.
 */
function independentEvidence(entity) {
  const parcelExplicit = entity.parcel_service_verified === "PARCEL_SERVICE_VERIFIED";
  const fleetExplicit = entity.own_fleet_status === "OWN_FLEET_VERIFIED";
  return {
    parcel_service: parcelExplicit ? true : "UNKNOWN",
    last_mile: "UNKNOWN",
    own_fleet: fleetExplicit ? true : "UNKNOWN",
    subcontractor_network: "UNKNOWN",
    api_documented: "UNKNOWN",
    sandbox_verified: false,
    live_contract_ready: false,
    coverage_status: "UNKNOWN",
    note: "Independent flags. Parcel may be proven while own fleet stays UNKNOWN.",
  };
}

function countIndependent(entities) {
  const flags = entities.map((e) => e.independentEvidence || independentEvidence(e));
  const yes = (k) => flags.filter((f) => f[k] === true).length;
  return {
    parcel_service_true: yes("parcel_service"),
    last_mile_true: yes("last_mile"),
    own_fleet_true: yes("own_fleet"),
    subcontractor_true: yes("subcontractor_network"),
    sandbox_true: yes("sandbox_verified"),
    live_true: yes("live_contract_ready"),
  };
}

module.exports = { independentEvidence, countIndependent };
