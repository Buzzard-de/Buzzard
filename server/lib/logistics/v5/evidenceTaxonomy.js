/**
 * Evidence layers. A register row is never a live usable carrier.
 */
const EVIDENCE_LEVELS = Object.freeze([
  "REGISTER_ENTRY",
  "LEGAL_ENTITY_NAMED",
  "ACTIVE_BUSINESS_VERIFIED",
  "PARCEL_SERVICE_VERIFIED",
  "LAST_MILE_VERIFIED",
  "OWN_FLEET_VERIFIED",
  "SUBCONTRACTOR_NETWORK_VERIFIED",
  "API_INTEGRATED",
  "LIVE_USABLE",
]);

function evidenceProfile(entity) {
  const cls = String(entity.class || "");
  let evidence_level = "REGISTER_ENTRY";
  if (entity.reliability === "RESEARCH_CANDIDATE") evidence_level = "LEGAL_ENTITY_NAMED";
  if (entity.networkRole === "ACTIVE_BUSINESS_VERIFIED") {
    evidence_level = "ACTIVE_BUSINESS_VERIFIED";
  }
  if (entity.networkRole === "UNKNOWN" && !entity.activityVerified) {
    evidence_level = entity.legalName ? "LEGAL_ENTITY_NAMED" : "REGISTER_ENTRY";
  }
  if (entity.networkRole === "ACCEPTANCE_POINT_ONLY") evidence_level = "REGISTER_ENTRY";
  if (entity.parcel_service_verified === "PARCEL_SERVICE_VERIFIED") evidence_level = "PARCEL_SERVICE_VERIFIED";
  if (entity.own_fleet_status === "OWN_FLEET_VERIFIED") evidence_level = "OWN_FLEET_VERIFIED";

  const letterVsParcel =
    /ACM_POSTVERVOERDIENST|LETTER_|CORRESPONDENCE/.test(cls)
      ? "LETTER_OR_POST_REGISTER_CLASS"
      : /ACM_PAKKETBEZORGDIENST/.test(cls)
        ? "PACKET_REGISTER_CLASS_NOT_PARCEL_SERVICE_PROOF"
        : /EETT_|UKE_POSTAL/.test(cls)
          ? "POSTAL_LICENCE_NOT_LAST_MILE_PROOF"
          : cls === "NATIONAL_POST_USP"
            ? "USP_DESIGNATION_NOT_NATIONWIDE_PARCEL_PROOF"
            : "UNKNOWN";

  return {
    country_code: entity.hqCountry || entity.country_code || "UNKNOWN",
    legal_entity_name: entity.legalName || entity.legal_entity_name || "UNKNOWN",
    trading_name: entity.brand || entity.trading_name || "UNKNOWN",
    company_registration_number: entity.companyNumber || entity.company_registration_number || "UNKNOWN",
    VAT_number: entity.vat && entity.vat !== "NOT_PUBLISHED" ? entity.vat : "UNKNOWN",
    regulator: entity.regulator || "UNKNOWN",
    licence_or_registration_id: entity.licenceId || entity.id || "UNKNOWN",
    source_url: Array.isArray(entity.sources) ? entity.sources[0] : entity.source_url || "UNKNOWN",
    source_date: entity.source_date || "UNKNOWN",
    last_verified_at: "2026-11-06",
    service_type: letterVsParcel,
    parcel_service_status: entity.parcel_service_verified || "UNKNOWN",
    letter_service_status: entity.letter_service_verified || "UNKNOWN",
    domestic_service: "UNKNOWN",
    international_service: "UNKNOWN",
    regional_service: /REGIONAL/.test(cls) ? "CLASS_LABEL_ONLY" : "UNKNOWN",
    last_mile_service: cls === "LAST_MILE" ? "CLASS_LABEL_ONLY" : "UNKNOWN",
    same_day_service: cls === "SAME_DAY" ? "CLASS_LABEL_ONLY" : "UNKNOWN",
    returns_service: "UNKNOWN",
    locker_network: cls === "PUDO_LOCKER" ? "NETWORK_NOT_CARRIER" : "UNKNOWN",
    pudo_network: cls === "PUDO_LOCKER" ? "NETWORK_NOT_CARRIER" : "UNKNOWN",
    own_fleet_status: entity.own_fleet_status || "UNKNOWN",
    subcontractor_status: "UNKNOWN",
    postcode_coverage_status: "UNKNOWN",
    api_status: entity.apiStatus || "UNKNOWN",
    sandbox_status: "NOT_AVAILABLE",
    evidence_level,
    confidence: String(entity.reliability || "").startsWith("VERIFIED") ? "SOURCE_BOUND" : "LOW",
    limitations: "Licence or register presence is not parcel, last-mile, own-fleet, or live-usable proof.",
    live_usable: false,
    api_integrated: false,
  };
}

function qualityMetrics(master) {
  const entities = master.entities || [];
  const profiles = entities.map(evidenceProfile);
  const countLevel = (lv) => profiles.filter((p) => p.evidence_level === lv).length;
  const cls = {};
  for (const e of entities) cls[e.class] = (cls[e.class] || 0) + 1;
  return {
    registerLayerRecordCount: master.registerLayerSum,
    namedEntityCount: entities.length,
    uniqueLegalEntityCount: master.uniqueLegalByCompanyKey,
    activeBusinessVerifiedCount: entities.filter((e) => e.activityVerified).length,
    parcelServiceVerifiedCount: profiles.filter((p) => p.parcel_service_status === "PARCEL_SERVICE_VERIFIED").length,
    lastMileVerifiedCount: 0,
    ownFleetVerifiedCount: master.ownFleetVerifiedCount,
    subcontractorNetworkVerifiedCount: 0,
    nationalPostalOperatorCount: cls.NATIONAL_POST_USP || 0,
    privateNationalCarrierClassCount:
      (cls.PRIVATE_PARCEL || 0) + (cls.PRIVATE_EXPRESS || 0) + (cls.NATIONAL_PARCEL_LETTER || 0),
    regionalCarrierClassCount: (cls.REGIONAL_SPECIALIST || 0) + (cls.REGIONAL_COURIER || 0),
    localCourierClassCount: cls.LOCAL_COURIER || 0,
    internationalBrandCountryOperationCount: (master.internationalOperations || []).length,
    lockerNetworkCount: (master.lockers || []).length,
    pudoNetworkCount: (master.pudo || []).length,
    postcodeCoverageVerifiedCountryCount: 0,
    apiDocumentationCount: (master.documentationCatalog || master.apiCatalog || []).length,
    mockTestSuccessCount: "SEE_TEST_RESULTS",
    sandboxTestSuccessCount: 0,
    contractRequiredCount: (master.documentationCatalog || master.apiCatalog || []).filter(
      (c) => c.contractRequired !== false && c.contract_status !== "SIGNED"
    ).length,
    liveUsableCarrierCount: 0,
    note: "Class-row counts are not verified last-mile companies. UNKNOWN is not coerced to zero except verified-evidence zeros.",
  };
}

module.exports = { EVIDENCE_LEVELS, evidenceProfile, qualityMetrics };
